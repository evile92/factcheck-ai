import { describe, it, expect } from 'vitest';
import { VerdictEngine } from '../services/verdict-engine';
import { EvidenceItem, ExtractedClaim } from '../types';

describe('Verdict Engine & Anti-Hallucination Decision Logic', () => {
  const engine = new VerdictEngine();

  const dummyClaim: ExtractedClaim = {
    id: 'c1',
    text: 'ادعاء تجريبي للاختبار',
    category: 'ادعاء عام',
    language: 'ar',
    searchQueries: ['ادعاء تجريبي'],
    evidenceIds: [],
  };

  it('outputs UNVERIFIED when no evidence items exist (Strict Anti-Hallucination)', () => {
    const verdict = engine.evaluate([dummyClaim], []);
    expect(verdict.verdict).toBe('UNVERIFIED');
    expect(verdict.confidence).toBeLessThanOrEqual(40);
  });

  it('outputs FALSE when fact checkers refute the claim', () => {
    const refutingEvidence: EvidenceItem[] = [
      {
        id: 'ev1',
        sourceUrl: 'https://factcheck.afp.com/fake-claim',
        sourceTitle: 'AFP Fact Check: This claim is completely false',
        sourceDomain: 'factcheck.afp.com',
        sourceSnippet: 'تقرير تدقيق: هذا الادعاء كاذب ولا أساس له من الصحة.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'factcheck',
        reliabilityScore: 0.92,
        tier: 2,
        stance: 'refutes',
        claimedAspect: 'ادعاء كاذب',
      },
    ];

    const verdict = engine.evaluate([dummyClaim], refutingEvidence);
    expect(verdict.verdict).toBe('FALSE');
    expect(verdict.confidence).toBeGreaterThanOrEqual(70);
  });

  it('outputs TRUE when strong Tier 1 and 2 sources corroborate the claim', () => {
    const supportingEvidence: EvidenceItem[] = [
      {
        id: 'ev1',
        sourceUrl: 'https://who.int/news/item/1',
        sourceTitle: 'WHO Official Statement',
        sourceDomain: 'who.int',
        sourceSnippet: 'أكدت منظمة الصحة العالمية صحة التقرير رسمياً.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'official',
        reliabilityScore: 0.95,
        tier: 1,
        stance: 'supports',
        claimedAspect: 'بيان منظمة الصحة',
      },
      {
        id: 'ev2',
        sourceUrl: 'https://reuters.com/article/1',
        sourceTitle: 'Reuters News Wire',
        sourceDomain: 'reuters.com',
        sourceSnippet: 'رويترز تؤكد الخبر بناء على الوثائق الأصلية.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'wire',
        reliabilityScore: 0.88,
        tier: 2,
        stance: 'supports',
        claimedAspect: 'بيان منظمة الصحة',
      },
    ];

    const verdict = engine.evaluate([dummyClaim], supportingEvidence);
    expect(verdict.verdict).toBe('TRUE');
    expect(verdict.confidence).toBeGreaterThanOrEqual(75);
  });

  it('outputs MISLEADING when context is recycled from an earlier date', () => {
    const recycledContext = {
      isRecycled: true,
      firstSeenDate: '2019-04-12',
    };

    const evidence: EvidenceItem[] = [
      {
        id: 'ev1',
        sourceUrl: 'https://archive.org/item/1',
        sourceTitle: 'أرشيف الأخبار القديم',
        sourceDomain: 'archive.org',
        sourceSnippet: 'صورة من زلزال عام 2019.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'news',
        reliabilityScore: 0.75,
        tier: 3,
        stance: 'mentions',
        claimedAspect: 'زلزال قديم',
      },
    ];

    const verdict = engine.evaluate([dummyClaim], evidence, [], undefined, recycledContext);
    expect(verdict.verdict).toBe('MISLEADING');
  });

  it('outputs TRUE with high confidence when multiple major news wires corroborate the event (Wire Consensus)', () => {
    const wireConsensusEvidence: EvidenceItem[] = [
      {
        id: 'ev1',
        sourceUrl: 'https://reuters.com/world/article1',
        sourceTitle: 'Trump says Iran probably responsible for attack on Saudi pipeline',
        sourceDomain: 'reuters.com',
        sourceSnippet: 'President Trump stated that Iran was likely behind the recent attack on Saudi oil infrastructure.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'wire',
        reliabilityScore: 0.88,
        tier: 2,
        stance: 'supports',
        claimedAspect: 'تصريح ترامب',
      },
      {
        id: 'ev2',
        sourceUrl: 'https://bbc.com/arabic/world-news-1',
        sourceTitle: 'ترامب يرجّح وقوف إيران خلف استهداف السعودية',
        sourceDomain: 'bbc.com',
        sourceSnippet: 'صرح الرئيس الأمريكي أن بلاده ترجح تورط إيران في الهجمات الأخيرة.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'news',
        reliabilityScore: 0.88,
        tier: 2,
        stance: 'supports',
        claimedAspect: 'تصريح ترامب',
      },
    ];

    const verdict = engine.evaluate([dummyClaim], wireConsensusEvidence);
    expect(verdict.verdict).toBe('TRUE');
    expect(verdict.confidence).toBeGreaterThanOrEqual(85);
    expect(verdict.verdictLabelAr).toContain('إجماع إخباري');
  });

  it('outputs TRUE when a single Tier 2 wire corroborates the event with zero refutations', () => {
    const singleWireEvidence: EvidenceItem[] = [
      {
        id: 'ev1',
        sourceUrl: 'https://reuters.com/world/article2',
        sourceTitle: 'Reuters report confirming event',
        sourceDomain: 'reuters.com',
        sourceSnippet: 'Exclusive report with confirmed documentation.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'wire',
        reliabilityScore: 0.88,
        tier: 2,
        stance: 'supports',
        claimedAspect: 'خبر حصري',
      },
    ];

    const verdict = engine.evaluate([dummyClaim], singleWireEvidence);
    expect(verdict.verdict).toBe('TRUE');
    expect(verdict.confidence).toBeGreaterThanOrEqual(72);
  });

  it('outputs FALSE when a single authoritative Tier 1/2 wire refutes with zero support', () => {
    const singleRefute: EvidenceItem[] = [
      {
        id: 'ev-ref',
        sourceUrl: 'https://reuters.com/world/denial',
        sourceTitle: 'Central bank officially denies rate hike rumor',
        sourceDomain: 'reuters.com',
        sourceSnippet: 'Official statement denies the claim.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'wire',
        reliabilityScore: 0.93,
        tier: 2,
        stance: 'refutes',
        claimedAspect: 'نفي رسمي',
      },
    ];

    const verdict = engine.evaluate([dummyClaim], singleRefute);
    expect(verdict.verdict).toBe('FALSE');
    expect(verdict.confidence).toBeGreaterThanOrEqual(70);
  });

  it('outputs MISLEADING satire for any Tier 5 satire domain including alhudood.net', () => {
    const satireEvidence: EvidenceItem[] = [
      {
        id: 'ev-satire',
        sourceUrl: 'https://alhudood.net/article/123',
        sourceTitle: 'الحدود: خبر طريف',
        sourceDomain: 'alhudood.net',
        sourceSnippet: 'مقال ساخر.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'news',
        reliabilityScore: 0.15,
        tier: 5,
        stance: 'mentions',
        claimedAspect: 'خبر ساخر',
      },
    ];

    const verdict = engine.evaluate([dummyClaim], satireEvidence);
    expect(verdict.verdict).toBe('MISLEADING');
    expect(verdict.verdictLabelEn).toContain('SATIRE');
  });

  it('outputs PARTLY_TRUE when credible sources strongly conflict', () => {
    const mixedEvidence: EvidenceItem[] = [
      {
        id: 'ev-sup',
        sourceUrl: 'https://aljazeera.net/news/1',
        sourceTitle: 'تقرير يدعم جزئياً',
        sourceDomain: 'aljazeera.net',
        sourceSnippet: 'تفاصيل مؤكدة جزئياً.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'news',
        reliabilityScore: 0.85,
        tier: 3,
        stance: 'supports',
        claimedAspect: 'جانب 1',
      },
      {
        id: 'ev-ref',
        sourceUrl: 'https://france24.com/news/2',
        sourceTitle: 'تقرير ينفي الأرقام',
        sourceDomain: 'france24.com',
        sourceSnippet: 'نفي لبعض التفاصيل.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'news',
        reliabilityScore: 0.85,
        tier: 3,
        stance: 'refutes',
        claimedAspect: 'جانب 2',
      },
    ];

    const verdict = engine.evaluate([dummyClaim], mixedEvidence);
    expect(verdict.verdict).toBe('PARTLY_TRUE');
  });
});

