import { ClaimCategory, ExtractedClaim } from '@/types';
import { detectLanguage, generateCrossLingualQueries } from '@/lib/language';
import { calculateSimilarity, cleanText } from '@/lib/text-utils';

export class ClaimExtractor {
  /**
   * Classifies claim category based on domain keywords and linguistic indicators.
   */
  classifyCategory(text: string): ClaimCategory {
    const lower = text.toLowerCase();

    // Satire indicators (explicit parody/satire markers — never trigger on geographical "الحدود"/border or vegetable "onion")
    if (
      lower.includes('ساخر') ||
      lower.includes('سخرية') ||
      lower.includes('نكتة') ||
      lower.includes('بارودي') ||
      lower.includes('تهكم') ||
      lower.includes('شبكة الحدود') ||
      lower.includes('موقع الحدود') ||
      lower.includes('صحيفة الحدود') ||
      lower.includes('alhudood') ||
      /\b(satire|satirical|parody|theonion|the onion|babylonbee|clickhole)\b/i.test(text)
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
      lower.includes('كورونا') ||
      /\b(cure|vaccine|cancer|health|virus|covid|pandemic|who)\b/i.test(text)
    ) {
      return 'طبي';
    }

    // Scientific
    if (
      lower.includes('علماء') ||
      lower.includes('بحث علمي') ||
      lower.includes('دراسة علمية') ||
      lower.includes('ناسا') ||
      lower.includes('فلك') ||
      lower.includes('كوكب') ||
      lower.includes('فيزياء') ||
      lower.includes('كيمياء') ||
      /\b(science|scientific|study|nasa|exoplanet|physics|chemistry)\b/i.test(text)
    ) {
      return 'علمي';
    }

    // Weather & Disasters
    if (
      lower.includes('زلزال') ||
      lower.includes('تسونامي') ||
      lower.includes('إعصار') ||
      lower.includes('اعصار') ||
      lower.includes('فيضان') ||
      lower.includes('طقس') ||
      lower.includes('عاصفة') ||
      lower.includes('بركان') ||
      /\b(earthquake|tsunami|flood|hurricane|cyclone|storm|volcano)\b/i.test(text)
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
      lower.includes('اسهم') ||
      lower.includes('نفط') ||
      lower.includes('ذهب') ||
      /\b(economy|economic|inflation|bank|interest rate|dollar|oil|stocks)\b/i.test(text)
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
      lower.includes('حدود') ||
      lower.includes('هدنة') ||
      /\b(assassination|assassinated|president|minister|election|government|parliament|military|border|ceasefire)\b/i.test(
        text
      )
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
      /\b(ai|artificial intelligence|tech|software|cyber|apple|google)\b/i.test(text)
    ) {
      return 'تقني';
    }

    // Numbers & Statistics
    if (/\b\d{1,3}(?:[.,]\d+)?%/.test(text) || /\b(مليون|مليار|بليون|trillion|billion|million)\b/i.test(text)) {
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
      /\b(football|soccer|fifa|match|championship)\b/i.test(text)
    ) {
      return 'رياضة';
    }

    // Celebrities
    if (lower.includes('فنان') || lower.includes('ممثل') || lower.includes('مغني') || /\bcelebrity\b/i.test(text)) {
      return 'مشاهير';
    }

    // History
    if (
      lower.includes('تاريخ') ||
      lower.includes('قرن') ||
      lower.includes('عام 19') ||
      lower.includes('عام 18') ||
      lower.includes('حضارة') ||
      /\b(ancient|century|historical)\b/i.test(text)
    ) {
      return 'تاريخي';
    }

    return 'ادعاء عام';
  }

  private isBoilerplate(sentence: string): boolean {
    const lower = sentence.toLowerCase();
    return (
      lower.includes('جميع الحقوق محفوظة') ||
      lower.includes('اشترك في') ||
      lower.includes('تابعونا على') ||
      lower.includes('اقرأ أيضاً') ||
      lower.includes('all rights reserved') ||
      lower.includes('subscribe to') ||
      lower.includes('privacy policy') ||
      lower.includes('cookie policy') ||
      /^https?:\/\/\S+$/i.test(sentence.trim())
    );
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

    // Split on sentence delimiters while preserving decimal numbers like 3.5 or 10.2%
    const sentences = cleaned
      .split(/(?<!\d)[.\n!؟?](?!\d)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25 && !this.isBoilerplate(s));

    const extracted: ExtractedClaim[] = [];
    const claimKeywords = [
      'اكتشف',
      'أعلن',
      'أكد',
      'نفى',
      'وفاة',
      'مقتل',
      'علاج',
      'إلغاء',
      'سقوط',
      'ارتفاع',
      'انخفاض',
      'رفع',
      'خفض',
      'ثبت',
      'قرار',
      'حظر',
      'اتفاق',
      'discovered',
      'announced',
      'confirmed',
      'denied',
      'dies',
      'killed',
      'cure',
      'banned',
      'raised',
      'cut',
    ];

    // Score sentences so the most assertive/factual claims are prioritized
    const scoredSentences = sentences
      .map((sentence, idx) => {
        const lower = sentence.toLowerCase();
        let priority = idx === 0 ? 2 : 0; // Headline/lead sentence gets boost
        if (claimKeywords.some((kw) => lower.includes(kw))) priority += 3;
        if (/\d/.test(sentence)) priority += 2;
        if (sentence.length >= 40 && sentence.length <= 240) priority += 1;
        return { sentence, priority, idx };
      })
      .sort((a, b) => b.priority - a.priority || a.idx - b.idx);

    for (const { sentence } of scoredSentences) {
      if (extracted.length >= 3) break;
      const isDuplicate = extracted.some((ex) => calculateSimilarity(ex.text, sentence) > 0.65);
      if (isDuplicate) continue;

      const truncated = sentence.length > 280 ? sentence.slice(0, 280).trim() : sentence;
      const category = this.classifyCategory(truncated);
      const queries = generateCrossLingualQueries(truncated, detectedLang.code);

      extracted.push({
        id: `claim-${extracted.length + 1}`,
        text: truncated,
        category,
        language: detectedLang.code,
        searchQueries: queries,
        evidenceIds: [],
      });
    }

    // Fallback if no specific sentence matched
    if (extracted.length === 0) {
      const fallbackText = (sentences[0] || cleaned).slice(0, 180);
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
