import { IProvider, ProviderResponse } from './base-provider';
import { EvidenceItem } from '@/types';
import { cleanText, extractKeyTerms } from '@/lib/text-utils';
import { globalReliabilityEngine } from '@/services/reliability-engine';

/**
 * NewsAPI.org provider powered by optional NEWS_API_KEY environment variable.
 */
export class NewsApiProvider implements IProvider {
  name = 'NewsAPI.org International Coverage';
  category = 'news' as const;
  requiresKey = true;

  private getApiKey(): string {
    return process.env.NEWS_API_KEY?.trim() || '';
  }

  isConfigured(): boolean {
    return this.getApiKey().length > 0;
  }

  async ping(): Promise<{ active: boolean; latencyMs: number }> {
    const start = Date.now();
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { active: false, latencyMs: 0 };
    }

    try {
      const res = await fetch('https://newsapi.org/v2/top-headlines?country=us&pageSize=1', {
        headers: { 'X-Api-Key': apiKey, 'User-Agent': 'FactCheckAI/1.0' },
        signal: AbortSignal.timeout(4000),
      });
      return { active: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { active: false, latencyMs: Date.now() - start };
    }
  }

  async search(query: string, language = 'ar'): Promise<ProviderResponse> {
    const start = Date.now();
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        providerName: this.name,
        success: false,
        evidence: [],
        latencyMs: 0,
        error: 'NEWS_API_KEY غير مضاف في ملف البيئة',
      };
    }

    try {
      const keyTerms = extractKeyTerms(query, 6);
      const searchQ = keyTerms.length >= 2 ? keyTerms.join(' ') : cleanText(query).slice(0, 120);
      const langParam = language === 'ar' ? 'ar' : 'en';
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        searchQ
      )}&language=${langParam}&sortBy=relevancy&pageSize=6`;

      const res = await fetch(url, {
        headers: { 'X-Api-Key': apiKey, 'User-Agent': 'FactCheckAI/1.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        throw new Error(`NewsAPI HTTP ${res.status}`);
      }

      const data = await res.json();
      const articles = Array.isArray(data.articles) ? data.articles : [];
      const evidence: EvidenceItem[] = [];

      for (const art of articles.slice(0, 6)) {
        if (!art?.url || !art?.title) continue;
        const rel = globalReliabilityEngine.evaluateUrl(art.url);
        if (!rel) continue;

        const snippet = cleanText(art.description || art.content || art.title).slice(0, 350);
        evidence.push({
          id: `newsapi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sourceUrl: art.url,
          sourceTitle: `${art.source?.name || rel.domain}: ${cleanText(art.title)}`,
          sourceDomain: rel.domain,
          sourceDate: typeof art.publishedAt === 'string' ? art.publishedAt.slice(0, 10) : undefined,
          sourceSnippet: snippet,
          retrievedAt: new Date().toISOString(),
          sourceType: rel.sourceType,
          reliabilityScore: rel.score,
          tier: rel.tier,
          stance: 'mentions',
          claimedAspect: query,
        });
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
