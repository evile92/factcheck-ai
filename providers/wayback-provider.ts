import { providerCache } from '@/lib/cache';

export interface WaybackSnapshot {
  firstSeenDate: string; // YYYY-MM-DD
  archiveUrl: string;
  originalUrl: string;
}

/**
 * Queries the free Internet Archive Wayback Machine CDX API to detect the earliest
 * public snapshot of a submitted URL (useful for recycled article/link detection).
 */
export class WaybackProvider {
  name = 'Internet Archive Wayback Machine';

  async ping(): Promise<{ active: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const res = await fetch(
        'https://web.archive.org/cdx/search/cdx?url=example.com&output=json&limit=1',
        { signal: AbortSignal.timeout(4000) }
      );
      return { active: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { active: false, latencyMs: Date.now() - start };
    }
  }

  async getEarliestSnapshot(targetUrl: string): Promise<WaybackSnapshot | null> {
    const cleanUrl = targetUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return null;
    }

    const cacheKey = `wayback:earliest:${cleanUrl}`;
    const cached = providerCache.get(cacheKey);
    if (cached !== null) {
      return cached || null;
    }

    try {
      const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(
        cleanUrl
      )}&output=json&limit=1&filter=statuscode:200&fl=timestamp,original`;

      const res = await fetch(cdxUrl, { signal: AbortSignal.timeout(4500) });
      if (!res.ok) return null;

      const data = await res.json();
      // CDX returns [ ['timestamp', 'original'], ['20190412153000', 'https://...'] ]
      if (!Array.isArray(data) || data.length < 2) {
        providerCache.set(cacheKey, false, 1800);
        return null;
      }

      const row = data[1];
      const ts: string = row?.[0] || '';
      const original: string = row?.[1] || cleanUrl;
      if (ts.length < 8) return null;

      const firstSeenDate = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
      const result: WaybackSnapshot = {
        firstSeenDate,
        archiveUrl: `https://web.archive.org/web/${ts}/${original}`,
        originalUrl: original,
      };

      providerCache.set(cacheKey, result, 3600);
      return result;
    } catch {
      return null;
    }
  }
}

export const globalWaybackProvider = new WaybackProvider();
