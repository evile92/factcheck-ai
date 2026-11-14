import { providerCache } from './cache';
import { escapeRegExp, extractKeyTerms } from './text-utils';

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
 * Extensive bidirectional entity & action dictionary for fact-checking cross-lingual search.
 */
export const AR_TO_EN_DICTIONARY: Record<string, string> = {
  // Key figures & World leaders
  خامنئي: 'Khamenei',
  ترامب: 'Trump',
  بايدن: 'Biden',
  نتنياهو: 'Netanyahu',
  بوتين: 'Putin',
  زيلينسكي: 'Zelenskyy',
  السيسي: 'Sisi',
  'محمد بن سلمان': 'Mohammed bin Salman',
  إردوغان: 'Erdogan',
  ماكرون: 'Macron',
  
  // Geopolitics & Places
  إيران: 'Iran',
  طهران: 'Tehran',
  إسرائيل: 'Israel',
  غزة: 'Gaza',
  فلسطين: 'Palestine',
  لبنان: 'Lebanon',
  بيروت: 'Beirut',
  سوريا: 'Syria',
  دمشق: 'Damascus',
  العراق: 'Iraq',
  بغداد: 'Baghdad',
  اليمن: 'Yemen',
  صنعاء: 'Sanaa',
  مصر: 'Egypt',
  القاهرة: 'Cairo',
  أمريكا: 'United States',
  'الولايات المتحدة': 'United States US',
  السعودية: 'Saudi Arabia',
  روسيا: 'Russia',
  موسكو: 'Moscow',
  الصين: 'China',
  بكين: 'Beijing',
  أوكرانيا: 'Ukraine',
  كييف: 'Kyiv',
  النسوية: 'feminism feminist',
  نسوية: 'feminism feminist',
  أنابيب: 'pipeline',
  النفط: 'oil crude',
  يرجح: 'probably likely',
  وقوف: 'behind responsible',
  استهداف: 'attack strike targeted',

  // Actions & Incidents
  اغتيال: 'assassination killed',
  مقتل: 'killed death',
  وفاة: 'death dies died',
  استشهاد: 'martyred killed',
  اعتقال: 'arrest arrested',
  استقالة: 'resignation resigns',
  إقالة: 'dismissed fired',
  إصابة: 'injured wounded',
  قصف: 'strike bombing strike',
  هجوم: 'attack',
  انفجار: 'explosion blast',
  غارة: 'airstrike strike',
  حريق: 'fire blaze',
  سقوط: 'downed crash fall',
  تحطم: 'crash destroyed',

  // Disasters & Nature
  زلزال: 'earthquake',
  تسونامي: 'tsunami',
  إعصار: 'hurricane cyclone storm',
  فيضان: 'flood',

  // Medical & Scientific
  سرطان: 'cancer',
  علاج: 'cure treatment',
  لقاح: 'vaccine',
  فيروس: 'virus',
  كورونا: 'covid coronavirus',
  'منظمة الصحة العالمية': 'World Health Organization WHO',
  'دراسة علمية': 'scientific study research',
  اكتشاف: 'discovery',
  علماء: 'scientists',
  ناسا: 'NASA',
  الفضاء: 'space',
  'الاحتباس الحراري': 'global warming climate change',

  // Organizations & News
  'الأمم المتحدة': 'United Nations UN',
  اليونسكو: 'UNESCO',
  'صندوق النقد الدولي': 'IMF International Monetary Fund',
  'البنك الدولي': 'World Bank',
  'البنك المركزي': 'Central Bank',
  'سعر الفائدة': 'interest rate',
  فائدة: 'interest rate',
  تضخم: 'inflation',
  دولار: 'dollar USD',
  اقتصاد: 'economy',
  أسهم: 'stocks market',
  نفط: 'oil crude',
  ذهب: 'gold',
  'ذكاء اصطناعي': 'artificial intelligence AI',
  حظر: 'ban banned',
  إلغاء: 'cancel cancelled',
  إغلاق: 'closure closed',
  انتخابات: 'elections',
  برلمان: 'parliament',
  رئيس: 'president',
  وزير: 'minister',
  حرب: 'war conflict',
  الحرب: 'war',
  هدنة: 'ceasefire truce',
  'بيان رسمي': 'official statement',
};

export const EN_TO_AR_DICTIONARY: Record<string, string> = {
  khamenei: 'خامنئي',
  trump: 'ترامب',
  biden: 'بايدن',
  netanyahu: 'نتنياهو',
  putin: 'بوتين',
  zelenskyy: 'زيلينسكي',
  iran: 'إيران',
  tehran: 'طهران',
  israel: 'إسرائيل',
  gaza: 'غزة',
  lebanon: 'لبنان',
  syria: 'سوريا',
  iraq: 'العراق',
  yemen: 'اليمن',
  egypt: 'مصر',
  saudi: 'السعودية',
  russia: 'روسيا',
  china: 'الصين',
  ukraine: 'أوكرانيا',
  feminism: 'النسوية نسوية',
  feminist: 'النسوية نسوية',
  war: 'حرب الحرب',
  pipeline: 'أنابيب',
  oil: 'النفط نفط',
  probably: 'يرجح',
  behind: 'وقوف',
  assassination: 'اغتيال',
  assassinated: 'اغتيال مقتل',
  killed: 'مقتل',
  death: 'وفاة مقتل',
  dies: 'وفاة',
  died: 'توفي مات',
  arrested: 'اعتقال',
  resigns: 'استقالة',
  cancer: 'سرطان',
  cure: 'علاج',
  vaccine: 'لقاح',
  virus: 'فيروس',
  covid: 'كورونا كوفيد',
  coronavirus: 'كورونا',
  who: 'منظمة الصحة العالمية',
  earthquake: 'زلزال',
  explosion: 'انفجار',
  attack: 'هجوم',
  airstrike: 'غارة جوية',
  fire: 'حريق',
  nasa: 'ناسا',
  'central bank': 'البنك المركزي',
  'interest rate': 'سعر الفائدة',
  inflation: 'تضخم',
  economy: 'اقتصاد',
  dollar: 'دولار',
  ban: 'حظر',
  banned: 'محظور حظر',
  ceasefire: 'هدنة وقف إطلاق النار',
  election: 'انتخابات',
};

/**
 * Translates claim between Arabic and English using MyMemory public API with local fallback.
 */
export async function translateCrossLingual(text: string, sourceLang: string): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';

  const from = sourceLang === 'ar' ? 'ar' : 'en';
  const to = from === 'ar' ? 'en' : 'ar';

  const cacheKey = `trans:${from}:${to}:${clean.toLowerCase()}`;
  const cached = providerCache.get(cacheKey);
  if (cached) return cached;

  // 1. Attempt free MyMemory translation API (2.5s timeout)
  try {
    const encoded = encodeURIComponent(clean.slice(0, 140));
    const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${from}|${to}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (
        translated &&
        typeof translated === 'string' &&
        translated.trim().length > 0 &&
        !translated.toLowerCase().includes('quota') &&
        !translated.toLowerCase().includes('invalid') &&
        !translated.toLowerCase().includes('mymemory warning') &&
        translated.trim().toLowerCase() !== clean.toLowerCase()
      ) {
        const result = translated.trim();
        providerCache.set(cacheKey, result, 86400); // 24 hours
        return result;
      }
    }
  } catch {
    // Timeout or network offline -> proceed to fallback dictionary
  }

  // 2. High-speed dictionary fallback
  const fallback = dictionaryFallback(clean, from, to);
  providerCache.set(cacheKey, fallback, 86400);
  return fallback;
}

function dictionaryFallback(text: string, from: 'ar' | 'en', to: 'ar' | 'en'): string {
  if (from === 'ar') {
    const terms: string[] = [];
    for (const [arWord, enWord] of Object.entries(AR_TO_EN_DICTIONARY)) {
      if (text.includes(arWord)) {
        terms.push(enWord);
      }
    }
    const years = text.match(/\b(19\d\d|20\d\d)\b/g) || [];
    if (years.length > 0) terms.push(...years);
    return terms.length > 0 ? Array.from(new Set(terms)).join(' ') : text;
  } else {
    const terms: string[] = [];
    for (const [enWord, arWord] of Object.entries(EN_TO_AR_DICTIONARY)) {
      const wordRegex = new RegExp(`\\b${escapeRegExp(enWord)}\\b`, 'i');
      if (wordRegex.test(text)) {
        terms.push(arWord);
      }
    }
    const years = text.match(/\b(19\d\d|20\d\d)\b/g) || [];
    if (years.length > 0) terms.push(...years);
    return terms.length > 0 ? Array.from(new Set(terms)).join(' ') : text;
  }
}

/**
 * Expands a single claim token into its known cross-lingual equivalents so cross-lingual
 * matching can evaluate coverage against the full claim concept count without shrinking the denominator.
 */
export function getCrossLingualEquivalents(concept: string, sourceLang: string): string[] {
  const equivalents: string[] = [concept];
  if (sourceLang === 'ar') {
    for (const [arKey, enVal] of Object.entries(AR_TO_EN_DICTIONARY)) {
      const normKey = arKey.replace(/[إأآءئؤ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
      const strippedKey = normKey.startsWith('ال') && normKey.length > 4 ? normKey.slice(2) : normKey;
      if (concept === normKey || concept === strippedKey) {
        for (const enTok of enVal.toLowerCase().split(/\s+/)) {
          if (enTok.length >= 2) equivalents.push(enTok);
        }
      }
    }
  } else {
    for (const [enKey, arVal] of Object.entries(EN_TO_AR_DICTIONARY)) {
      if (concept === enKey.toLowerCase()) {
        for (const arTok of arVal.split(/\s+/)) {
          const normAr = arTok.replace(/[إأآءئؤ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
          const stripped = normAr.startsWith('ال') && normAr.length > 4 ? normAr.slice(2) : normAr;
          equivalents.push(normAr, stripped);
        }
      }
    }
  }
  return Array.from(new Set(equivalents));
}

/**
 * Generates paired bilingual queries for concurrent Arabic & English verification.
 */
export async function getBilingualQueries(
  text: string,
  detectedLangCode: string
): Promise<{ arQuery: string; enQuery: string }> {
  const clean = text.trim();
  // Condense very long sentences to essential key terms so search APIs return matches
  const concise = clean.length > 100 ? extractKeyTerms(clean, 8).join(' ') || clean.slice(0, 100) : clean;
  const isAr = detectedLangCode === 'ar' || detectLanguage(clean).code === 'ar';

  if (isAr) {
    const enTranslation = await translateCrossLingual(concise, 'ar');
    return {
      arQuery: concise,
      enQuery: enTranslation || concise,
    };
  } else {
    const arTranslation = await translateCrossLingual(concise, 'en');
    return {
      arQuery: arTranslation || concise,
      enQuery: concise,
    };
  }
}

/**
 * Expands a claim into targeted search queries in both native and international languages.
 */
export function generateCrossLingualQueries(claimText: string, langCode: string): string[] {
  const queries: string[] = [claimText.trim()];

  if (langCode === 'ar') {
    const englishTerms: string[] = [];
    for (const [arWord, enWord] of Object.entries(AR_TO_EN_DICTIONARY)) {
      if (claimText.includes(arWord)) {
        englishTerms.push(enWord);
      }
    }

    const years = claimText.match(/\b(19\d\d|20\d\d)\b/g) || [];
    if (years.length > 0) {
      englishTerms.push(...years);
    }

    if (englishTerms.length > 0) {
      queries.push(`${englishTerms.join(' ')} fact check`);
    }

    queries.push(`حقيقة "${claimText.slice(0, 60)}"`);
    queries.push(`صحة خبر ${claimText.slice(0, 60)}`);
  } else {
    queries.push(`"${claimText.slice(0, 80)}" fact check`);
    queries.push(`${claimText.slice(0, 80)} true false rumor`);
  }

  return Array.from(new Set(queries.filter(Boolean)));
}

