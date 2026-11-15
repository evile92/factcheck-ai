import { describe, it, expect, afterEach } from 'vitest';
import { WikipediaProvider } from '../providers/wikipedia-provider';
import { GoogleFactCheckProvider } from '../providers/google-factcheck';
import { NewsApiProvider } from '../providers/newsapi-provider';
import { BingSearchProvider } from '../providers/bing-search-provider';
import { ProviderRegistry } from '../providers/provider-registry';
import { AIReasoner } from '../services/ai-reasoner';

describe('Provider Layer & Fallback Resilience', () => {
  const prevGemini = process.env.GEMINI_API_KEY;
  const prevOpenAi = process.env.OPENAI_API_KEY;
  const prevNewsApi = process.env.NEWS_API_KEY;
  const prevBing = process.env.BING_SEARCH_API_KEY;

  afterEach(() => {
    if (prevGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevGemini;
    if (prevOpenAi === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevOpenAi;
    if (prevNewsApi === undefined) delete process.env.NEWS_API_KEY;
    else process.env.NEWS_API_KEY = prevNewsApi;
    if (prevBing === undefined) delete process.env.BING_SEARCH_API_KEY;
    else process.env.BING_SEARCH_API_KEY = prevBing;
  });

  it('optional key-gated providers gracefully report unconfigured state without throwing', async () => {
    delete process.env.NEWS_API_KEY;
    delete process.env.BING_SEARCH_API_KEY;

    const gfc = new GoogleFactCheckProvider();
    const newsApi = new NewsApiProvider();
    const bing = new BingSearchProvider();

    expect(newsApi.isConfigured()).toBe(false);
    expect(bing.isConfigured()).toBe(false);

    const [gfcRes, newsRes, bingRes] = await Promise.all([
      gfc.search('test query'),
      newsApi.search('test query'),
      bing.search('test query'),
    ]);

    expect(gfcRes.providerName).toContain('Google Fact Check');
    if (!gfc.isConfigured()) {
      expect(gfcRes.success).toBe(false);
      expect(gfcRes.error).toBeDefined();
    }
    expect(newsRes.success).toBe(false);
    expect(bingRes.success).toBe(false);
  });

  it('AIReasoner detects configured Gemini and OpenAI keys cleanly', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const reasoner = new AIReasoner();
    expect(reasoner.getProviderStatus()).toEqual({ configured: false, activeProviders: [] });

    process.env.GEMINI_API_KEY = 'test-gemini-placeholder';
    process.env.OPENAI_API_KEY = 'test-openai-placeholder';
    expect(reasoner.getProviderStatus()).toEqual({
      configured: true,
      activeProviders: ['gemini', 'openai'],
    });
  });

  it('Wikipedia Provider queries successfully and returns formatted evidence', async () => {
    const wiki = new WikipediaProvider();
    const res = await wiki.search('الأمم المتحدة', 'ar');
    expect(res.providerName).toContain('Wikipedia');
    expect(res.success).toBe(true);
    if (res.evidence.length > 0) {
      expect(res.evidence[0].sourceDomain).toContain('wikipedia.org');
      expect(res.evidence[0].tier).toBe(2);
    }
  }, 10000);

  it('ProviderRegistry registers extended providers and executes searches concurrently without crashing', async () => {
    const registry = new ProviderRegistry();
    expect(registry.getProviders().length).toBeGreaterThanOrEqual(8);
    const results = await registry.searchAll('الاحتباس الحراري', 'ar', true);
    expect(Array.isArray(results)).toBe(true);
  }, 15000);
});
