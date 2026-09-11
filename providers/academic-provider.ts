import { IProvider, ProviderResponse } from './base-provider';
import { EvidenceItem } from '@/types';
import { cleanText } from '@/lib/text-utils';

export class AcademicProvider implements IProvider {
  name = 'CrossRef Scholarly & Scientific Registry';
  category = 'academic' as const;

  isConfigured(): boolean {
    return true; // Free, open REST API
  }

  async ping(): Promise<{ active: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const res = await fetch('https://api.crossref.org/works?rows=1&mailto=contact@factcheck.ai', {
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
      // Query CrossRef works endpoint
      const url = `https://api.crossref.org/works?query=${encodeURIComponent(
        query
      )}&rows=3&mailto=contact@factcheck.ai`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'FactCheckAI/1.0 (mailto:contact@factcheck.ai)' },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        throw new Error(`CrossRef HTTP ${res.status}`);
      }

      const data = await res.json();
      const items = data.message?.items || [];
      const evidence: EvidenceItem[] = [];

      for (const item of items) {
        const title = item.title?.[0] ? cleanText(item.title[0]) : 'ورقة بحثية علمية مُحكمة';
        const doiUrl = item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : '');
        if (!doiUrl) continue;

        const publisher = item.publisher || 'ناشر علمي دولي';
        const dateParts = item.published?.['date-parts']?.[0];
        let pubDate: string | undefined;
        if (dateParts && dateParts.length > 0) {
          pubDate = dateParts.join('-');
        }

        const journalName = item['container-title']?.[0] || publisher;

        evidence.push({
          id: `academic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sourceUrl: doiUrl,
          sourceTitle: `بحث علمي محكم: ${title}`,
          sourceDomain: 'doi.org',
          sourceDate: pubDate,
          sourceSnippet: `نُشر في الدورية العلمية: ${journalName}. الناشر: ${publisher}. DOI: ${item.DOI}.`,
          retrievedAt: new Date().toISOString(),
          sourceType: 'academic',
          reliabilityScore: 0.95, // Tier 1: Peer-Reviewed Scientific Research
          tier: 1,
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
