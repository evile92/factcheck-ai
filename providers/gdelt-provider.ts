import { IProvider, ProviderResponse } from './base-provider';
import { EvidenceItem } from '@/types';

export class GdeltProvider implements IProvider {
  name = 'GDELT Global News Database';
  category = 'news' as const;

  isConfigured(): boolean {
    return true; // 100% free open API
  }

  async ping(): Promise<{ active: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const res = await fetch('https://api.gdeltproject.org/api/v2/doc/doc?query=health&mode=artlist&maxrecords=1&format=json', {
        signal: AbortSignal.timeout(5000),
      });
      return { active: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { active: false, latencyMs: Date.now() - start };
    }
  }

  async search(query: string): Promise<ProviderResponse> {
    const start = Date.now();
    try {
      // Simplify query for GDELT syntax (remove quotes or complex chars)
      const sanitized = query.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).slice(0, 4).join(' ');
      if (!sanitized) {
        return { providerName: this.name, success: true, evidence: [], latencyMs: 0 };
      }

      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(
        sanitized
      )}&mode=artlist&maxrecords=4&format=json`;

      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) {
        throw new Error(`GDELT HTTP ${res.status}`);
      }

      const data = await res.json();
      const articles = data.articles || [];
      const evidence: EvidenceItem[] = [];

      for (const art of articles) {
        const domain = art.domain || (art.url ? new URL(art.url).hostname : 'gdeltproject.org');
        const title = art.title || 'تقرير إخباري دولي';
        const seendate = art.seendate; // e.g. 20260210T120000Z

        let formattedDate: string | undefined;
        if (seendate && seendate.length >= 8) {
          formattedDate = `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}`;
        }

        evidence.push({
          id: `gdelt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sourceUrl: art.url,
          sourceTitle: title,
          sourceDomain: domain,
          sourceDate: formattedDate,
          sourceSnippet: `المصدر الإخباري: ${domain}. تم رصد الخبر ضمن قاعدة بيانات الأحداث العالمية GDELT بتاريخ ${formattedDate || 'غير محدد'}.`,
          retrievedAt: new Date().toISOString(),
          sourceType: 'news',
          reliabilityScore: 0.75,
          tier: 3,
          stance: 'mentions',
          claimedAspect: title,
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
