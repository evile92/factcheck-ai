/**
 * Language detection and cross-lingual query expansion.
 */

export interface DetectedLanguage {
  code: 'ar' | 'en' | 'fr' | 'es' | 'de' | 'other';
  name: string;
  isRtl: boolean;
  confidence: number;
}

export function detectLanguage(text: string): DetectedLanguage {
  const clean = text.trim();
  if (!clean) {
    return { code: 'ar', name: 'العربية', isRtl: true, confidence: 1.0 };
  }

  // Count Arabic characters
  const arabicMatches = clean.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || [];
  const arabicRatio = arabicMatches.length / clean.length;

  if (arabicRatio > 0.15) {
    return { code: 'ar', name: 'العربية', isRtl: true, confidence: Math.min(1.0, arabicRatio * 3) };
  }

  // Count Latin characters
  const latinMatches = clean.match(/[a-zA-Z]/g) || [];
  const latinRatio = latinMatches.length / clean.length;

  if (latinRatio > 0.15) {
    // Basic French detection (accents, common stopwords)
    const frenchWords = /\b(le|la|les|un|une|des|est|sont|dans|pour|avec|cette|ce|qui|que)\b/i;
    if (frenchWords.test(clean) || /[éèêëàâîïôûùç]/i.test(clean)) {
      return { code: 'fr', name: 'Français', isRtl: false, confidence: 0.85 };
    }

    // Basic Spanish detection
    const spanishWords = /\b(el|la|los|las|un|una|es|son|en|por|con|esta|este|que)\b/i;
    if (spanishWords.test(clean) || /[ñáéíóúü¿¡]/i.test(clean)) {
      return { code: 'es', name: 'Español', isRtl: false, confidence: 0.85 };
    }

    return { code: 'en', name: 'English', isRtl: false, confidence: 0.9 };
  }

  return { code: 'other', name: 'لغة أخرى', isRtl: false, confidence: 0.5 };
}

/**
 * Common bilingual entity dictionary for fact-checking cross-lingual search
 */
const ENTITY_TRANSLATION_MAP: Record<string, string> = {
  // Medical & Scientific
  'سرطان': 'cancer',
  'علاج': 'cure treatment',
  'لقاح': 'vaccine',
  'فيروس': 'virus',
  'كورونا': 'covid coronavirus',
  'منظمة الصحة العالمية': 'World Health Organization WHO',
  'دراسة علمية': 'scientific study research',
  'اكتشاف': 'discovery',
  'ناسا': 'NASA',
  'الفضاء': 'space',
  // Disasters & Nature
  'زلزال': 'earthquake',
  'تسونامي': 'tsunami',
  'إعصار': 'hurricane cyclone storm',
  'فيضان': 'flood',
  'انفجار': 'explosion blast',
  'حريق': 'fire blaze',
  // Organizations & International
  'الأمم المتحدة': 'United Nations UN',
  'اليونسكو': 'UNESCO',
  'صندوق النقد الدولي': 'IMF International Monetary Fund',
  'البنك الدولي': 'World Bank',
  // News & Politics
  'خامنئي': 'Khamenei',
  'إيران': 'Iran',
  'طهران': 'Tehran',
  'إسرائيل': 'Israel',
  'غزة': 'Gaza',
  'لبنان': 'Lebanon',
  'رئيس': 'president',
  'وزير': 'minister',
  'وفاة': 'death dies died',
  'مقتل': 'killed death killed',
  'اغتيال': 'assassination killed',
  'استقالة': 'resignation resigns',
  'حرب': 'war conflict',
  'هدنة': 'ceasefire truce',
};

/**
 * Expands a claim into targeted search queries in both native and international (English) languages.
 */
export function generateCrossLingualQueries(claimText: string, langCode: string): string[] {
  const queries: string[] = [claimText.trim()];

  // If Arabic, synthesize an English query by mapping keywords or translating core terms
  if (langCode === 'ar') {
    const englishTerms: string[] = [];
    for (const [arWord, enWord] of Object.entries(ENTITY_TRANSLATION_MAP)) {
      if (claimText.includes(arWord)) {
        englishTerms.push(enWord);
      }
    }

    // Extract named entities or dates
    const years = claimText.match(/\b(19\d\d|20\d\d)\b/g) || [];
    if (years.length > 0) {
      englishTerms.push(...years);
    }

    if (englishTerms.length > 0) {
      queries.push(`${englishTerms.join(' ')} fact check`);
    }

    // Add explicit fact check keywords in Arabic
    queries.push(`حقيقة "${claimText.slice(0, 60)}"`);
    queries.push(`صحة خبر ${claimText.slice(0, 60)}`);
  } else {
    // Non-Arabic, add fact check search suffixes
    queries.push(`"${claimText.slice(0, 80)}" fact check`);
    queries.push(`${claimText.slice(0, 80)} true false rumor`);
  }

  return Array.from(new Set(queries.filter(Boolean)));
}
