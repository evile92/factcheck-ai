import { describe, it, expect } from 'vitest';
import { SourceReliabilityEngine } from '../services/reliability-engine';

describe('Source Reliability Engine (5 Tiers)', () => {
  const engine = new SourceReliabilityEngine();

  it('assigns Tier 1 to government, official organizations, and scientific domains', () => {
    expect(engine.evaluateSource('who.int').tier).toBe(1);
    expect(engine.evaluateSource('cdc.gov').tier).toBe(1);
    expect(engine.evaluateSource('doi.org').tier).toBe(1);
    expect(engine.evaluateSource('ox.ac.uk').tier).toBe(1);
  });

  it('assigns Tier 2 to wire agencies, accredited fact-checkers, and curated encyclopedias', () => {
    expect(engine.evaluateSource('reuters.com').tier).toBe(2);
    expect(engine.evaluateSource('apnews.com').tier).toBe(2);
    expect(engine.evaluateSource('snopes.com').tier).toBe(2);
    expect(engine.evaluateSource('ar.wikipedia.org').tier).toBe(2);
  });

  it('assigns Tier 3 to mainstream news publications', () => {
    expect(engine.evaluateSource('aljazeera.net').tier).toBe(3);
    expect(engine.evaluateSource('france24.com').tier).toBe(3);
  });

  it('assigns Tier 4 to unvetted blogs and generic sites', () => {
    expect(engine.evaluateSource('random-blog-123.net').tier).toBe(4);
  });

  it('assigns Tier 5 to satire and disreputable platforms', () => {
    const res = engine.evaluateSource('theonion.com');
    expect(res.tier).toBe(5);
    expect(res.isSatire).toBe(true);

    const resAr = engine.evaluateSource('alhudood.net');
    expect(resAr.tier).toBe(5);
    expect(resAr.isSatire).toBe(true);
  });
});
