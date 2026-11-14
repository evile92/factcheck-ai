import { describe, it, expect } from 'vitest';
import { ClaimExtractor } from '../services/claim-extractor';
import { detectLanguage } from '../lib/language';

describe('Claim Extraction & Taxonomy System', () => {
  const extractor = new ClaimExtractor();

  it('detects language accurately', () => {
    expect(detectLanguage('علماء يكتشفون علاجًا نهائيًا للسرطان').code).toBe('ar');
    expect(detectLanguage('NASA discovers a new Earth-like exoplanet').code).toBe('en');
    expect(detectLanguage('Le président annonce une nouvelle mesure').code).toBe('fr');
  });

  it('classifies claim categories correctly', () => {
    expect(extractor.classifyCategory('علماء يكتشفون دواء جديد لمرض السرطان')).toBe('طبي');
    expect(extractor.classifyCategory('ناسا تطلق تلسكوب فضائي جديد لاستكشاف الكواكب')).toBe('علمي');
    expect(extractor.classifyCategory('زلزال بقوة 7 درجات يضرب سواحل المحيط')).toBe('طقس / كوارث');
    expect(extractor.classifyCategory('البنك المركزي يرفع سعر الفائدة لمكافحة التضخم')).toBe('اقتصادي');
    expect(extractor.classifyCategory('موقع الحدود الساخر ينشر تقريراً جديداً')).toBe('سخرية / Satire');
  });

  it('extracts discrete claims and generates multilingual queries', () => {
    const claims = extractor.extractClaims('علماء يكتشفون علاجًا نهائيًا للسرطان');
    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0].category).toBe('طبي');
    expect(claims[0].searchQueries.length).toBeGreaterThan(1);
    // Verify cross-lingual English expansion
    expect(claims[0].searchQueries.some((q) => q.includes('cancer') || q.includes('cure'))).toBe(true);
  });

  it('does not misclassify border news or regular "ai" substrings as satire or tech', () => {
    expect(extractor.classifyCategory('اشتباكات عسكرية على الحدود الشمالية بين الجيشين')).toBe('سياسي');
    expect(extractor.classifyCategory('Onion prices rise sharply in local markets')).not.toBe('سخرية / Satire');
    expect(extractor.classifyCategory('The minister said the claim is being reviewed')).not.toBe('تقني');
  });

  it('preserves decimal numbers when splitting multi-sentence text', () => {
    const text =
      'أعلن البنك المركزي أن التضخم بلغ 3.5% هذا العام وفق التقارير الرسمية المنشورة. كما أكد التقرير استقرار الاحتياطي النقدي الأجنبي خلال الربع الأول.';
    const claims = extractor.extractClaims(text);
    expect(claims.some((c) => c.text.includes('3.5%'))).toBe(true);
  });
});
