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

  it('filters out irrelevant academic papers and unrelated background items', () => {
    const claim: ExtractedClaim = {
      id: 'c-rate',
      text: 'البنك المركزي يرفع سعر الفائدة بنسبة 2%',
      category: 'اقتصادي',
      language: 'ar',
      searchQueries: ['البنك المركزي سعر الفائدة'],
      evidenceIds: [],
    };

    const rawItems: EvidenceItem[] = [
      {
        id: 'irrelevant-doi',
        sourceUrl: 'https://doi.org/10.1000/xyz',
        sourceTitle: 'بحث علمي محكم: Marine algae taxonomy in Pacific Ocean',
        sourceDomain: 'doi.org',
        sourceDate: '2018-05-01',
        sourceSnippet: 'Botanical classification of deep sea kelp species.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'academic',
        reliabilityScore: 0.95,
        tier: 1,
        stance: 'mentions',
        claimedAspect: 'Marine algae',
      },
      {
        id: 'relevant-reuters',
        sourceUrl: 'https://reuters.com/markets/central-bank-holds-rate',
        sourceTitle: 'البنك المركزي يقرر تثبيت سعر الفائدة دون تغيير',
        sourceDomain: 'reuters.com',
        sourceDate: new Date().toISOString().split('T')[0],
        sourceSnippet: 'أكد البنك المركزي تثبيت سعر الفائدة والإبقاء على المعدلات الحالية.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'wire',
        reliabilityScore: 0.93,
        tier: 2,
        stance: 'mentions',
        claimedAspect: 'سعر الفائدة',
      },
    ];

    const { rankedEvidence } = aggregator.processEvidence(rawItems, [claim]);
    expect(rankedEvidence.some((e) => e.id === 'irrelevant-doi')).toBe(false);
    expect(rankedEvidence.length).toBe(1);
    // Polarity opposite ("يرفع" vs "تثبيت") must classify as refutes, not supports!
    expect(rankedEvidence[0].stance).toBe('refutes');
  });

  it('flags exaggerated medical claims as refuted when evidence reports preliminary/partial results', () => {
    const cancerClaim: ExtractedClaim = {
      id: 'c-cancer',
      text: 'علماء يكتشفون علاجًا نهائيًا للسرطان بنسبة 100%',
      category: 'طبي',
      language: 'ar',
      searchQueries: ['cancer cure 100%'],
      evidenceIds: [],
    };

    const rawItems: EvidenceItem[] = [
      {
        id: 'ev-med',
        sourceUrl: 'https://bbc.com/health/cancer-trial',
        sourceTitle: 'علماء يختبرون علاجاً للسرطان في تجارب أولية على الفئران بنسبة 35%',
        sourceDomain: 'bbc.com',
        sourceDate: new Date().toISOString().split('T')[0],
        sourceSnippet: 'أكد الباحثون أنها تجارب أولية على الفئران ولا يوجد علاج نهائي للسرطان بنسبة 35% فقط.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'news',
        reliabilityScore: 0.93,
        tier: 2,
        stance: 'mentions',
        claimedAspect: 'علاج السرطان',
      },
    ];

    const { rankedEvidence } = aggregator.processEvidence(rawItems, [cancerClaim]);
    expect(rankedEvidence.length).toBe(1);
    expect(rankedEvidence[0].stance).toBe('refutes');
  });

  it('does not falsely flag current breaking news as recycled because of old Wikipedia dates', () => {
    const todayIso = new Date().toISOString().split('T')[0];
    const rawItems: EvidenceItem[] = [
      {
        id: 'wiki-old',
        sourceUrl: 'https://ar.wikipedia.org/wiki/إيران',
        sourceTitle: 'موسوعة ويكيبيديا: إيران وترامب',
        sourceDomain: 'ar.wikipedia.org',
        sourceDate: '2018-03-10',
        sourceSnippet: 'معلومات موسوعية عن تاريخ العلاقات حول ترامب وإيران والنفط السعودي.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'wiki',
        reliabilityScore: 0.78,
        tier: 2,
        stance: 'mentions',
        claimedAspect: 'إيران',
      },
      {
        id: 'fresh-news',
        sourceUrl: 'https://reuters.com/world/fresh-story',
        sourceTitle: 'ترامب يرجح وقوف إيران خلف استهداف أنابيب النفط السعودية',
        sourceDomain: 'reuters.com',
        sourceDate: todayIso,
        sourceSnippet: 'أكد ترامب في تصريح جديد حول استهداف أنابيب النفط السعودية.',
        retrievedAt: new Date().toISOString(),
        sourceType: 'wire',
        reliabilityScore: 0.93,
        tier: 2,
        stance: 'mentions',
        claimedAspect: 'استهداف أنابيب النفط',
      },
    ];

    const { earliestContext } = aggregator.processEvidence(rawItems, [trumpClaim]);
    expect(earliestContext?.isRecycled).toBe(false);
  });
});
