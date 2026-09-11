import { describe, it, expect } from 'vitest';
import { WikipediaProvider } from '../providers/wikipedia-provider';
import { GoogleFactCheckProvider } from '../providers/google-factcheck';
import { ProviderRegistry } from '../providers/provider-registry';

describe('Provider Layer & Fallback Resilience', () => {
  it('Google Fact Check gracefully reports unconfigured state without throwing', async () => {
    const gfc = new GoogleFactCheckProvider();
    const res = await gfc.search('test query');
    expect(res.providerName).toContain('Google Fact Check');
    // If no key in test environment, it returns a clean error instead of breaking
    if (!gfc.isConfigured()) {
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    }
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

  it('ProviderRegistry executes searches concurrently without crashing', async () => {
    const registry = new ProviderRegistry();
    const results = await registry.searchAll('الاحتباس الحراري', 'ar', true);
    expect(Array.isArray(results)).toBe(true);
  }, 15000);
});
