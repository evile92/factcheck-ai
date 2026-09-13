import { describe, it, expect } from 'vitest';
import { EvidenceAggregator } from '../services/evidence-aggregator';
import { EvidenceItem, ExtractedClaim } from '../types';

describe('Evidence Aggregator & Stance Detection', () => {
  const aggregator = new EvidenceAggregator();

  const trumpClaim: ExtractedClaim = {
    id: 'c-trump',
    text: 'ترامب يرجح وقوف إيران خلف استهداف أنابيب النفط السعودية',
    category: 'سياسي',
    language: 'ar',
    searchQueries: ['ترامب إيران استهداف السعودية'],
    evidenceIds: [],
  };

  it('promotes news articles with reporting language and high semantic overlap to supports', () => {
    const rawItems: EvidenceItem[] = [
      {
        id: 'ev1',
        sourceUrl: 'https://bbc.com/arabic/world-5',
        sourceTitle: 'ترامب يرجّح وقوف إيران خلف استهداف السعودية...',
        sourceDomain: 'bbc.com',
        sourceSnippet: 'الرئيس الأمريكي دونالد ترامب يرجح وقوف إيران خلف الهجمات على منشآت نفطية.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'news',
        reliabilityScore: 0.88,
        tier: 2,
        stance: 'mentions',
        claimedAspect: 'تصريح ترامب',
      },
      {
        id: 'ev2',
        sourceUrl: 'https://reuters.com/article/trump-iran-oil',
        sourceTitle: 'Trump says Iran probably responsible for attack on Saudi pipeline',
        sourceDomain: 'reuters.com',
        sourceSnippet: 'President Trump says Iran probably behind Saudi oil attack according to reports.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'wire',
        reliabilityScore: 0.88,
        tier: 2,
        stance: 'mentions',
        claimedAspect: 'Trump Iran claim',
      },
    ];

    const { rankedEvidence } = aggregator.processEvidence(rawItems, [trumpClaim]);

    expect(rankedEvidence.length).toBe(2);
    expect(rankedEvidence[0].stance).toBe('supports');
    expect(rankedEvidence[1].stance).toBe('supports');
  });

  it('correctly classifies refuting articles as refutes even if reporting words are present', () => {
    const rawItems: EvidenceItem[] = [
      {
        id: 'ev3',
        sourceUrl: 'https://factcheck.afp.com/adel-emam-rumor',
        sourceTitle: 'نقابة المهن التمثيلية تنفي شائعة وفاة الفنان',
        sourceDomain: 'factcheck.afp.com',
        sourceSnippet: 'بيان رسمي ينفي بشكل قاطع هذه المزاعم ويؤكد أنها شائعة عارية عن الصحة.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'factcheck',
        reliabilityScore: 0.95,
        tier: 2,
        stance: 'mentions',
        claimedAspect: 'وفاة الفنان',
      },
    ];

    const { rankedEvidence } = aggregator.processEvidence(rawItems, [trumpClaim]);

    expect(rankedEvidence.length).toBe(1);
    expect(rankedEvidence[0].stance).toBe('refutes');
  });
});
