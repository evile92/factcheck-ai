import { IProvider, ProviderResponse } from './base-provider';
import { EvidenceItem } from '@/types';
import { cleanText } from '@/lib/text-utils';

export class WikipediaProvider implements IProvider {
  name = 'Wikipedia / Wikimedia Knowledge Base';
  category = 'wiki' as const;

  isConfigured(): boolean {
    return true; // Completely free, open REST API
  }

  async ping(): Promise<{ active: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const res = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/Fact-checking', {
        headers: { 'User-Agent': 'FactCheckAI/1.0 (https://factcheck.ai; contact@factcheck.ai)' },
        signal: AbortSignal.timeout(4000),
      });
      return { active: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { active: false, latencyMs: Date.now() - start };
    }
  }

  async search(query: string, language = 'ar'): Promise<ProviderResponse> {
    const start = Date.now();
    try {
      const evidence: EvidenceItem[] = [];
      const langSubdomain = language === 'ar' ? 'ar' : 'en';

      // 1. Search Wikipedia Opensearch / query API
      const searchUrl = `https://${langSubdomain}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query
      )}&format=json&utf8=1&srlimit=3`;

      const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'FactCheckAI/1.0 (https://factcheck.ai)' },
        signal: AbortSignal.timeout(5000),
      });

      if (!searchRes.ok) {
        throw new Error(`Wikipedia HTTP ${searchRes.status}`);
      }

      const searchData = await searchRes.json();
      const results = searchData?.query?.search || [];

      for (const item of results) {
        const title = item.title;
        const pageUrl = `https://${langSubdomain}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`;
        const snippet = cleanText(item.snippet || '');

        evidence.push({
          id: `wiki-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sourceUrl: pageUrl,
          sourceTitle: `موسوعة ويكيبيديا: ${title}`,
          sourceDomain: `${langSubdomain}.wikipedia.org`,
          sourceDate: item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : undefined,
          sourceSnippet: snippet,
          retrievedAt: new Date().toISOString(),
          sourceType: 'wiki',
          reliabilityScore: 0.85, // Curated Encyclopedia
          tier: 2,
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
