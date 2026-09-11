import { ClaimCategory, ExtractedClaim } from '@/types';
import { detectLanguage, generateCrossLingualQueries } from '@/lib/language';
import { cleanText } from '@/lib/text-utils';

export class ClaimExtractor {
  /**
   * Classifies claim category based on domain keywords and linguistic indicators.
   */
  classifyCategory(text: string): ClaimCategory {
    const lower = text.toLowerCase();

    // Satire indicators
    if (
      lower.includes('ساخر') ||
      lower.includes('satire') ||
      lower.includes('onion') ||
      lower.includes('الحدود') ||
      lower.includes('نكتة') ||
      lower.includes('بارودي')
    ) {
      return 'سخرية / Satire';
    }

    // Medical / Health
    if (
      lower.includes('علاج') ||
      lower.includes('سرطان') ||
      lower.includes('لقاح') ||
      lower.includes('فيروس') ||
      lower.includes('مرض') ||
      lower.includes('طبيب') ||
      lower.includes('صحة') ||
      lower.includes('دواء') ||
      lower.includes('cure') ||
      lower.includes('vaccine') ||
      lower.includes('cancer') ||
      lower.includes('health')
    ) {
      return 'طبي';
    }

    // Scientific
    if (
      lower.includes('علماء') ||
      lower.includes('بحث علمي') ||
      lower.includes('ناسا') ||
      lower.includes('فلك') ||
      lower.includes('كوكب') ||
      lower.includes('فيزياء') ||
      lower.includes('كيمياء') ||
      lower.includes('science') ||
      lower.includes('study') ||
      lower.includes('nasa')
    ) {
      return 'علمي';
    }

    // Weather & Disasters
    if (
      lower.includes('زلزال') ||
      lower.includes('تسونامي') ||
      lower.includes('إعصار') ||
      lower.includes('فيضان') ||
      lower.includes('طقس') ||
      lower.includes('عاصفة') ||
      lower.includes('earthquake') ||
      lower.includes('flood') ||
      lower.includes('hurricane')
    ) {
      return 'طقس / كوارث';
    }

    // Economics
    if (
      lower.includes('دولار') ||
      lower.includes('اقتصاد') ||
      lower.includes('تضخم') ||
      lower.includes('بنك') ||
      lower.includes('فائدة') ||
      lower.includes('أسهم') ||
      lower.includes('نفط') ||
      lower.includes('economy') ||
      lower.includes('inflation') ||
      lower.includes('bank')
    ) {
      return 'اقتصادي';
    }

    // Politics & Geopolitics
    if (
      lower.includes('اغتيال') ||
      lower.includes('مقتل') ||
      lower.includes('خامنئي') ||
      lower.includes('رئيس') ||
      lower.includes('وزير') ||
      lower.includes('حكومة') ||
      lower.includes('انتخابات') ||
      lower.includes('برلمان') ||
      lower.includes('حزب') ||
      lower.includes('زعيم') ||
      lower.includes('انقلاب') ||
      lower.includes('حرب') ||
      lower.includes('عسكري') ||
      lower.includes('assassination') ||
      lower.includes('president') ||
      lower.includes('minister') ||
      lower.includes('election')
    ) {
      return 'سياسي';
    }

    // Technology
    if (
      lower.includes('ذكاء اصطناعي') ||
      lower.includes('تطبيق') ||
      lower.includes('هاتف') ||
      lower.includes('أبل') ||
      lower.includes('جوجل') ||
      lower.includes('هكر') ||
      lower.includes('ai') ||
      lower.includes('tech') ||
      lower.includes('software')
    ) {
      return 'تقني';
    }

    // Numbers & Statistics
    if (/\b\d{2,}%/.test(text) || /\b(مليون|مليار|بليون|trillion|billion|million)\b/i.test(text)) {
      return 'أرقام وإحصائيات';
    }

    // Sports
    if (
      lower.includes('مباراة') ||
      lower.includes('لاعب') ||
      lower.includes('كأس العالم') ||
      lower.includes('كرة قدم') ||
      lower.includes('ريال مدريد') ||
      lower.includes('برشلونة') ||
      lower.includes('football') ||
      lower.includes('fifa')
    ) {
      return 'رياضة';
    }

    // Celebrities
    if (lower.includes('فنان') || lower.includes('ممثل') || lower.includes('مغني') || lower.includes('celebrity')) {
      return 'مشاهير';
    }

    // History
    if (
      lower.includes('تاريخ') ||
      lower.includes('قرن') ||
      lower.includes('عام 19') ||
      lower.includes('عام 18') ||
      lower.includes('حضارة') ||
      lower.includes('ancient')
    ) {
      return 'تاريخي';
    }

    return 'ادعاء عام';
  }

  /**
   * Extracts one or more discrete claims from raw text or article.
   */
  extractClaims(rawInput: string): ExtractedClaim[] {
    const cleaned = cleanText(rawInput);
    if (!cleaned) return [];

    const detectedLang = detectLanguage(cleaned);

    // If input is short (< 180 chars), it is likely a single claim
    if (cleaned.length < 180) {
      const category = this.classifyCategory(cleaned);
      const queries = generateCrossLingualQueries(cleaned, detectedLang.code);

      return [
        {
          id: `claim-1`,
          text: cleaned,
          category,
          language: detectedLang.code,
          searchQueries: queries,
          evidenceIds: [],
        },
      ];
    }

    // For longer texts, break into key sentences that contain assertive claim language
    const sentences = cleaned
      .split(/[.\n!؟?]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25);

    const extracted: ExtractedClaim[] = [];
    const claimKeywords = [
      'اكتشف',
      'أعلن',
      'أكد',
      'وفاة',
      'مقتل',
      'علاج',
      'إلغاء',
      'سقوط',
      'ارتفاع',
      'انخفاض',
      'قرار',
      'حظر',
      'discovered',
      'announced',
      'dies',
      'killed',
      'cure',
      'banned',
    ];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const isClaimLike = claimKeywords.some((kw) => sentence.toLowerCase().includes(kw)) || sentence.length > 40;

      if (isClaimLike && extracted.length < 3) {
        const category = this.classifyCategory(sentence);
        const queries = generateCrossLingualQueries(sentence, detectedLang.code);

        extracted.push({
          id: `claim-${extracted.length + 1}`,
          text: sentence,
          category,
          language: detectedLang.code,
          searchQueries: queries,
          evidenceIds: [],
        });
      }
    }

    // Fallback if no specific sentence matched
    if (extracted.length === 0 && sentences.length > 0) {
      const fallbackText = sentences[0].slice(0, 150);
      const category = this.classifyCategory(fallbackText);
      extracted.push({
        id: `claim-1`,
        text: fallbackText,
        category,
        language: detectedLang.code,
        searchQueries: generateCrossLingualQueries(fallbackText, detectedLang.code),
        evidenceIds: [],
      });
    }

    return extracted;
  }
}

export const globalClaimExtractor = new ClaimExtractor();
