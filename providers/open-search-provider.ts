import { IProvider, ProviderResponse } from './base-provider';
import { EvidenceItem } from '@/types';
import { cleanText, extractKeyTerms } from '@/lib/text-utils';

export class OpenSearchProvider implements IProvider {
  name = 'DuckDuckGo Instant Knowledge API';
  category = 'search' as const;

  isConfigured(): boolean {
    return true; // Free, open API
  }

  async ping(): Promise<{ active: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const res = await fetch('https://api.duckduckgo.com/?q=Earth&format=json', {
        signal: AbortSignal.timeout(4000),
      });
      return { active: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { active: false, latencyMs: Date.now() - start };
    }
  }

  async search(query: string): Promise<ProviderResponse> {
    const start = Date.now();
    try {
      const concise = query.trim().length > 50 ? extractKeyTerms(query, 4).join(' ') || query : query;
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(concise)}&format=json&no_html=1&skip_disambig=1`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'FactCheckAI/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        throw new Error(`DuckDuckGo HTTP ${res.status}`);
      }

      const data = await res.json();
      const evidence: EvidenceItem[] = [];

      // 1. Direct Abstract
      if (data.AbstractText && data.AbstractURL) {
        const domain = new URL(data.AbstractURL).hostname;
        evidence.push({
          id: `ddg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sourceUrl: data.AbstractURL,
          sourceTitle: `${data.Heading || query} (DuckDuckGo Verified Knowledge)`,
          sourceDomain: domain,
          sourceSnippet: cleanText(data.AbstractText),
          retrievedAt: new Date().toISOString(),
          sourceType: 'official',
          reliabilityScore: 0.85,
          tier: 2,
          stance: 'mentions',
          claimedAspect: data.Heading || query,
        });
      }

      // 2. Related Topics
      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 3)) {
          if (topic.Text && topic.FirstURL) {
            let domain = 'duckduckgo.com';
            try {
              domain = new URL(topic.FirstURL).hostname;
            } catch {}

            evidence.push({
              id: `ddg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              sourceUrl: topic.FirstURL,
              sourceTitle: cleanText(topic.Text.slice(0, 70)),
              sourceDomain: domain,
              sourceSnippet: cleanText(topic.Text),
              retrievedAt: new Date().toISOString(),
              sourceType: 'news',
              reliabilityScore: 0.70,
              tier: 3,
              stance: 'mentions',
              claimedAspect: query,
            });
          }
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
