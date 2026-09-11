import { IProvider, ProviderResponse } from './base-provider';
import { GoogleFactCheckProvider } from './google-factcheck';
import { WikipediaProvider } from './wikipedia-provider';
import { GdeltProvider } from './gdelt-provider';
import { NewsRssProvider } from './news-rss-provider';
import { OpenSearchProvider } from './open-search-provider';
import { AcademicProvider } from './academic-provider';
import { EvidenceItem, ProviderHealth } from '@/types';
import { providerCache } from '@/lib/cache';

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
   * Dispatches queries to all suitable providers concurrently.
   */
  async searchAll(query: string, language = 'ar', isScientific = false): Promise<EvidenceItem[]> {
    const cacheKey = `search:${language}:${query}:${isScientific}`;
    const cached = providerCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const tasks = this.providers.map(async (provider) => {
      // If query is not scientific, can skip academic provider or let it run with low priority
      if (provider.category === 'academic' && !isScientific) {
        return null;
      }

      try {
        const res = await provider.search(query, language);
        const stats = this.healthStats.get(provider.name);
        if (stats) {
          stats.lastLatency = res.latencyMs;
          stats.lastChecked = new Date().toISOString();
          if (!res.success) stats.errorCount++;
        }
        return res;
      } catch (err) {
        const stats = this.healthStats.get(provider.name);
        if (stats) {
          stats.errorCount++;
          stats.lastChecked = new Date().toISOString();
        }
        return null;
      }
    });

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
   * Health check monitoring for all registered providers.
   */
  async getHealthDashboard(): Promise<ProviderHealth[]> {
    const healthList: ProviderHealth[] = [];

    for (const provider of this.providers) {
      const stats = this.healthStats.get(provider.name) || {
        errorCount: 0,
        lastLatency: 0,
        lastChecked: new Date().toISOString(),
      };

      const configured = provider.isConfigured();
      let status: 'active' | 'degraded' | 'offline' = 'active';

      if (!configured && provider.name.includes('Google Fact Check')) {
        status = 'degraded';
      } else if (stats.errorCount > 3) {
        status = 'degraded';
      }

      healthList.push({
        name: provider.name,
        category: provider.category,
        status,
        latencyMs: stats.lastLatency || 120,
        lastChecked: stats.lastChecked,
        freeTier: true,
        requiresKey: provider.name.includes('Google Fact Check'),
        hasKey: configured,
        errorCount: stats.errorCount,
      });
    }

    return healthList;
  }
}

export const globalProviderRegistry = new ProviderRegistry();
