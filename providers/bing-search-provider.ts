import { IProvider, ProviderResponse } from './base-provider';
import { EvidenceItem } from '@/types';
import { cleanText, extractKeyTerms } from '@/lib/text-utils';
import { globalReliabilityEngine } from '@/services/reliability-engine';

/**
 * Bing Web Search API v7 provider powered by optional BING_SEARCH_API_KEY.
 */
export class BingSearchProvider implements IProvider {
  name = 'Bing Web Search API';
  category = 'search' as const;
  requiresKey = true;

  private getApiKey(): string {
    return process.env.BING_SEARCH_API_KEY?.trim() || '';
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
      const res = await fetch('https://api.bing.microsoft.com/v7.0/search?q=test&count=1', {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey, 'User-Agent': 'FactCheckAI/1.0' },
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
        error: 'BING_SEARCH_API_KEY غير مضاف في ملف البيئة',
      };
    }

    try {
      const keyTerms = extractKeyTerms(query, 6);
      const searchQ = keyTerms.length >= 2 ? keyTerms.join(' ') : cleanText(query).slice(0, 120);
      const mkt = language === 'ar' ? 'ar-SA' : 'en-US';
      const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(searchQ)}&mkt=${mkt}&count=6`;

      const res = await fetch(url, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey, 'User-Agent': 'FactCheckAI/1.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        throw new Error(`Bing Search HTTP ${res.status}`);
      }

      const data = await res.json();
      const pages = Array.isArray(data?.webPages?.value) ? data.webPages.value : [];
      const evidence: EvidenceItem[] = [];

      for (const item of pages.slice(0, 6)) {
        if (!item?.url || !item?.name) continue;
        const rel = globalReliabilityEngine.evaluateUrl(item.url);
        if (!rel) continue;

        evidence.push({
          id: `bing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sourceUrl: item.url,
          sourceTitle: `${rel.domain}: ${cleanText(item.name)}`,
          sourceDomain: rel.domain,
          sourceDate: typeof item.dateLastCrawled === 'string' ? item.dateLastCrawled.slice(0, 10) : undefined,
          sourceSnippet: cleanText(item.snippet || item.name).slice(0, 350),
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
