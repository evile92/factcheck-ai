import { IProvider, ProviderResponse } from './base-provider';
import { EvidenceItem } from '@/types';

export class GoogleFactCheckProvider implements IProvider {
  name = 'Google Fact Check Tools API';
  category = 'factcheck' as const;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async ping(): Promise<{ active: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      if (!this.isConfigured()) {
        return { active: false, latencyMs: 0 };
      }
      const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=test&key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      return { active: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { active: false, latencyMs: Date.now() - start };
    }
  }

  async search(query: string, language = 'ar'): Promise<ProviderResponse> {
    const start = Date.now();
    if (!this.isConfigured()) {
      return {
        providerName: this.name,
        success: false,
        evidence: [],
        latencyMs: 0,
        error: 'GOOGLE_FACT_CHECK_API_KEY غير مضاف في ملف البيئة .env',
      };
    }

    try {
      const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(
        query
      )}&languageCode=${language}&key=${this.apiKey}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const claims = data.claims || [];
      const evidence: EvidenceItem[] = [];

      for (const item of claims) {
        const reviews = item.claimReview || [];
        for (const review of reviews) {
          const publisher = review.publisher?.name || 'Fact Check Organization';
          const domain = review.publisher?.site || review.url ? new URL(review.url).hostname : 'factcheck.org';
          const rating = review.textualRating?.toLowerCase() || '';

          let stance: 'supports' | 'refutes' | 'neutral' | 'mentions' = 'mentions';
          if (rating.includes('false') || rating.includes('incorrect') || rating.includes('كاذب') || rating.includes('مضلل') || rating.includes('fake')) {
            stance = 'refutes';
          } else if (rating.includes('true') || rating.includes('correct') || rating.includes('صحيح')) {
            stance = 'supports';
          } else if (rating.includes('misleading') || rating.includes('partly') || rating.includes('جزئي')) {
            stance = 'neutral';
          }

          evidence.push({
            id: `gfc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            sourceUrl: review.url,
            sourceTitle: `${publisher}: ${review.title || item.text || 'مراجعة حقيقة ادعاء'}`,
            sourceDomain: domain,
            sourceDate: review.reviewDate || item.claimDate,
            sourceSnippet: `الحكم الصادر: "${review.textualRating}". الادعاء المفحوص: "${item.text}".`,
            retrievedAt: new Date().toISOString(),
            sourceType: 'factcheck',
            reliabilityScore: 0.90, // Certified Fact Checker
            tier: 2,
            stance,
            claimedAspect: item.text || query,
          });
        }
      }

      return {
        providerName: this.name,
        success: true,
        evidence,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        providerName: this.name,
        success: false,
        evidence: [],
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }
}
