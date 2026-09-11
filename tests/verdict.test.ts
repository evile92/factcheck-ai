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
});
