import { IProvider, ProviderResponse } from './base-provider';
import { EvidenceItem } from '@/types';
import * as cheerio from 'cheerio';
import { cleanText } from '@/lib/text-utils';

export class NewsRssProvider implements IProvider {
  name = 'Google News Live RSS';
  category = 'news' as const;

  isConfigured(): boolean {
    return true; // Free, open RSS feed
  }

  async ping(): Promise<{ active: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const res = await fetch('https://news.google.com/rss?hl=ar&gl=AE&ceid=AE:ar', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
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
      const hl = language === 'ar' ? 'ar' : 'en';
      const gl = language === 'ar' ? 'AE' : 'US';
      const ceid = language === 'ar' ? 'AE:ar' : 'US:en';

      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        throw new Error(`Google News RSS HTTP ${res.status}`);
      }

      const xmlText = await res.text();
      const $ = cheerio.load(xmlText, { xmlMode: true });
      const items = $('item').slice(0, 10).toArray();
      const evidence: EvidenceItem[] = [];

      for (const el of items) {
        const item = $(el);
        const rawTitle = cleanText(item.find('title').text());
        const link = item.find('link').text() || item.find('guid').text();
        const pubDateStr = item.find('pubDate').text();
        const sourceEl = item.find('source');
        const sourceName = cleanText(sourceEl.text()) || 'وكالة إخبارية';
        const sourceUrlAttr = sourceEl.attr('url') || '';
        const description = cleanText(item.find('description').text());

        let isoDate: string | undefined;
        try {
          if (pubDateStr) {
            isoDate = new Date(pubDateStr).toISOString().split('T')[0];
          }
        } catch {
          // ignore date parse error
        }

        // Extract true publisher domain from source attribute
        let domain = 'news.google.com';
        if (sourceUrlAttr) {
          try {
            domain = new URL(sourceUrlAttr).hostname.replace(/^www\./, '');
          } catch {}
        } else if (link.startsWith('http')) {
          try {
            const parsed = new URL(link).hostname.replace(/^www\./, '');
            if (!parsed.includes('google.com')) {
              domain = parsed;
            }
          } catch {}
        }

        // Clean trailing " - SourceName" from Google News titles
        let cleanTitle = rawTitle;
        if (sourceName && cleanTitle.endsWith(sourceName)) {
          cleanTitle = cleanTitle.replace(new RegExp(`\\s*-\\s*${sourceName}$`), '').trim();
        }

        evidence.push({
          id: `news-rss-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sourceUrl: link,
          sourceTitle: `${sourceName}: ${cleanTitle}`,
          sourceDomain: domain,
          sourceDate: isoDate,
          sourceSnippet: description || cleanTitle,
          retrievedAt: new Date().toISOString(),
          sourceType: 'news',
          reliabilityScore: 0.85,
          tier: 2,
          stance: 'mentions',
          claimedAspect: cleanTitle,
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
