import { IProvider, ProviderResponse } from './base-provider';
import { GoogleFactCheckProvider } from './google-factcheck';
import { WikipediaProvider } from './wikipedia-provider';
import { GdeltProvider } from './gdelt-provider';
import { NewsRssProvider } from './news-rss-provider';
import { OpenSearchProvider } from './open-search-provider';
import { AcademicProvider } from './academic-provider';
import { EvidenceItem, ProviderHealth } from '@/types';
import { providerCache } from '@/lib/cache';
import { getBilingualQueries } from '@/lib/language';
import { globalWaybackProvider } from './wayback-provider';

export class ProviderRegistry {
  private providers: IProvider[] = [];
  private healthStats: Map<string, { errorCount: number; lastLatency: number; lastChecked: string }> = new Map();

  constructor() {
    this.register(new GoogleFactCheckProvider());
    this.register(new WikipediaProvider());
    this.register(new GdeltProvider());
    this.register(new NewsRssProvider());
    this.register(new OpenSearchProvider());
    this.register(new AcademicProvider());
  }

  register(provider: IProvider) {
    this.providers.push(provider);
    this.healthStats.set(provider.name, {
      errorCount: 0,
      lastLatency: 0,
      lastChecked: new Date().toISOString(),
    });
  }

  getProviders(): IProvider[] {
    return this.providers;
  }

  /**
   * Dispatches bilingual queries to all suitable providers concurrently.
   * Searches both Arabic media and English/international sources simultaneously.
   */
  async searchAll(query: string, language = 'ar', isScientific = false): Promise<EvidenceItem[]> {
    const cacheKey = `search:bilingual:${query}:${isScientific}`;
    const cached = providerCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Retrieve paired bilingual queries (Arabic & English)
    const { arQuery, enQuery } = await getBilingualQueries(query, language);

    const tasks: Promise<ProviderResponse | null>[] = [];

    for (const provider of this.providers) {
      if (provider.category === 'academic') {
        if (isScientific) {
          // CrossRef DOIs are predominantly in English
          tasks.push(provider.search(enQuery || arQuery).catch(() => null));
        }
        continue;
      }

      // 1. Arabic index search
      if (arQuery) {
        tasks.push(
          (async () => {
            try {
              const res = await provider.search(arQuery, 'ar');
              const stats = this.healthStats.get(provider.name);
              if (stats) {
                stats.lastLatency = res.latencyMs;
                stats.lastChecked = new Date().toISOString();
                if (!res.success) stats.errorCount++;
              }
              return res;
            } catch {
              return null;
            }
          })()
        );
      }

      // 2. English / International index search (in parallel)
      if (enQuery && enQuery.trim().toLowerCase() !== arQuery.trim().toLowerCase()) {
        tasks.push(
          (async () => {
            try {
              const res = await provider.search(enQuery, 'en');
              const stats = this.healthStats.get(provider.name);
              if (stats) {
                stats.lastLatency = res.latencyMs;
                stats.lastChecked = new Date().toISOString();
                if (!res.success) stats.errorCount++;
              }
              return res;
            } catch {
              return null;
            }
          })()
        );
      }
    }

    const results = await Promise.allSettled(tasks);
    const aggregatedEvidence: EvidenceItem[] = [];

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value && res.value.success) {
        aggregatedEvidence.push(...res.value.evidence);
      }
    }

    providerCache.set(cacheKey, aggregatedEvidence, 1800); // 30 min cache
    return aggregatedEvidence;
  }

  /**
   * Health check monitoring for all registered providers using real concurrent pings (cached 60s).
   */
  async getHealthDashboard(): Promise<ProviderHealth[]> {
    const cachedHealth = providerCache.get('health:dashboard:v2') as ProviderHealth[] | null;
    if (cachedHealth) {
      return cachedHealth;
    }

    const pingResults: ProviderHealth[] = await Promise.all(
      this.providers.map(async (provider): Promise<ProviderHealth> => {
        const stats = this.healthStats.get(provider.name) || {
          errorCount: 0,
          lastLatency: 0,
          lastChecked: new Date().toISOString(),
        };

        const configured = provider.isConfigured();
        const pingRes = configured ? await provider.ping().catch(() => ({ active: false, latencyMs: 0 })) : { active: false, latencyMs: 0 };

        let status: 'active' | 'degraded' | 'offline' = 'active';
        if (!configured && provider.name.includes('Google Fact Check')) {
          status = 'degraded';
        } else if (!pingRes.active) {
          status = 'offline';
        } else if (stats.errorCount > 3) {
          status = 'degraded';
        }

        const nowIso = new Date().toISOString();
        stats.lastLatency = pingRes.latencyMs || stats.lastLatency;
        stats.lastChecked = nowIso;
        this.healthStats.set(provider.name, stats);

        return {
          name: provider.name,
          category: provider.category,
          status,
          latencyMs: pingRes.latencyMs || stats.lastLatency || 0,
          lastChecked: nowIso,
          freeTier: true,
          requiresKey: provider.name.includes('Google Fact Check'),
          hasKey: configured,
          errorCount: stats.errorCount,
        } satisfies ProviderHealth;
      })
    );

    const wbPing = await globalWaybackProvider.ping().catch(() => ({ active: false, latencyMs: 0 }));
    pingResults.push({
      name: globalWaybackProvider.name,
      category: 'media',
      status: wbPing.active ? 'active' : 'offline',
      latencyMs: wbPing.latencyMs,
      lastChecked: new Date().toISOString(),
      freeTier: true,
      requiresKey: false,
      hasKey: true,
      errorCount: 0,
    });

    providerCache.set('health:dashboard:v2', pingResults, 60);
    return pingResults;
  }
}

export const globalProviderRegistry = new ProviderRegistry();
