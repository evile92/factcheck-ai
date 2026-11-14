/**
 * Text processing and string similarity utilities.
 */

/**
 * Converts Eastern Arabic / Hindi digits (٠-٩) to standard Western Arabic digits (0-9).
 */
export function toWesternDigits(input: string | number): string {
  return String(input)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
}

/**
 * Formats dates ensuring Latin/Western Arabic digits (1234567890) are strictly used.
 */
export function formatDisplayDate(date: Date | string, lang: 'ar' | 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const formatted = d.toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return toWesternDigits(formatted);
}

export function cleanText(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ') // Strip HTML
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const AR_STOPWORDS = new Set([
  'في', 'من', 'على', 'إلى', 'الى', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك', 'الذي', 'التي', 'الذين',
  'اللذين', 'اللواتي', 'كما', 'بين', 'بعد', 'قبل', 'منذ', 'حتى', 'خلال', 'عبر', 'ضد', 'نحو', 'حول',
  'فوق', 'تحت', 'أمام', 'امام', 'خلف', 'عند', 'لدى', 'هناك', 'هنا', 'حيث', 'أو', 'او', 'ثم', 'بل',
  'لكن', 'أن', 'ان', 'إن', 'كان', 'كانت', 'يكون', 'تكون', 'ليس', 'ليست', 'وقد', 'فقد', 'لقد',
  'هل', 'ما', 'ماذا', 'متى', 'أين', 'كيف', 'لماذا', 'كل', 'بعض', 'جميع', 'غير', 'سوى', 'أي', 'اي',
  'هو', 'هي', 'هم', 'هن', 'نحن', 'أنت', 'انت', 'انا', 'أنا', 'الخبر', 'خبر', 'عاجل', 'فيديو', 'صورة',
  'صحة', 'حقيقة', 'تداول', 'تداولت', 'منصات', 'التواصل', 'مواقع', 'بسبب', 'بشأن', 'بشان', 'وفقا', 'وفق',
]);

const EN_STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her', 'was', 'one',
  'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two',
  'way', 'who', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'that', 'with', 'have', 'this',
  'will', 'your', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very',
  'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'more', 'only', 'over', 'such',
  'take', 'than', 'them', 'well', 'were', 'what', 'which', 'their', 'there', 'about', 'after', 'again',
  'also', 'because', 'before', 'between', 'could', 'first', 'into', 'other', 'should', 'since',
  'these', 'those', 'through', 'under', 'where', 'while', 'would', 'breaking', 'news', 'video', 'photo',
]);

const IMPORTANT_SHORT_TOKENS = new Set(['ai', 'un', 'us', 'uk', 'eu', 'uae', 'gcc']);

/**
 * Normalizes Arabic characters (Hamzas, Teh Marbuta, Alef Maqsura).
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[إأآءئؤ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0640]/g, ''); // Remove Arabic tashkeel & tatweel
}

const NORMALIZED_AR_STOPWORDS = new Set(Array.from(AR_STOPWORDS).map((w) => normalizeArabic(w)));

/**
 * Tokenize string into a set of normalized, stopword-filtered words for semantic similarity matching.
 */
export function tokenize(str: string): Set<string> {
  const western = toWesternDigits(str);
  const normalized = normalizeArabic(western)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim();
  const words = normalized.split(/\s+/).filter((w) => w.length > 2 || IMPORTANT_SHORT_TOKENS.has(w) || /^\d+$/.test(w));
  const tokenSet = new Set<string>();

  for (const w of words) {
    if (NORMALIZED_AR_STOPWORDS.has(w) || EN_STOPWORDS.has(w)) {
      continue;
    }

    tokenSet.add(w);
    // Strip common Arabic definite article prefix (ال)
    if (w.startsWith('ال') && w.length > 4) {
      const bare = w.slice(2);
      if (!NORMALIZED_AR_STOPWORDS.has(bare)) {
        tokenSet.add(bare);
      }
    }
    // Strip single-letter prepositions/conjunctions only on sufficiently long words
    if ((w.startsWith('و') || w.startsWith('ف') || w.startsWith('ب') || w.startsWith('ل')) && w.length > 5) {
      const bare = w.slice(1);
      if (!NORMALIZED_AR_STOPWORDS.has(bare)) {
        tokenSet.add(bare);
      }
    }
  }

  return tokenSet;
}

/**
 * Extracts concise meaningful search keywords from a claim or headline.
 */
export function extractKeyTerms(text: string, maxTerms = 6): string[] {
  const western = toWesternDigits(cleanText(text));
  const words = western
    .replace(/[^\p{L}\p{N}\s%]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const result: string[] = [];
  const seenNormalized = new Set<string>();

  for (const raw of words) {
    const lower = raw.toLowerCase();
    const norm = normalizeArabic(lower);
    if (norm.length <= 2 && !IMPORTANT_SHORT_TOKENS.has(lower) && !/^\d+%?$/.test(lower)) {
      continue;
    }
    if (NORMALIZED_AR_STOPWORDS.has(norm) || EN_STOPWORDS.has(lower)) {
      continue;
    }
    if (seenNormalized.has(norm)) continue;
    seenNormalized.add(norm);
    result.push(raw);
    if (result.length >= maxTerms) break;
  }

  return result;
}

export interface NumericFact {
  value: number;
  raw: string;
  isPercent: boolean;
  isYear: boolean;
}

/**
 * Extracts normalized numbers, percentages, and years from text for contradiction detection.
 */
export function extractNumericFacts(text: string): NumericFact[] {
  const western = toWesternDigits(text);
  const facts: NumericFact[] = [];
  const regex = /(\d+(?:[.,]\d+)?)\s*(%|٪|مليار|مليون|ألف|الف|billion|million|thousand)?/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(western)) !== null) {
    const rawNum = match[1].replace(/,/g, '');
    const baseVal = parseFloat(rawNum);
    if (isNaN(baseVal)) continue;

    const unit = (match[2] || '').toLowerCase();
    const isPercent = unit === '%' || unit === '٪';
    let value = baseVal;
    if (unit === 'مليار' || unit === 'billion') value *= 1_000_000_000;
    else if (unit === 'مليون' || unit === 'million') value *= 1_000_000;
    else if (unit === 'ألف' || unit === 'الف' || unit === 'thousand') value *= 1_000;

    const isYear = !isPercent && !unit && Number.isInteger(baseVal) && baseVal >= 1800 && baseVal <= 2100;
    facts.push({ value, raw: match[0].trim(), isPercent, isYear });
  }

  return facts;
}

/**
 * Computes Jaccard similarity between two texts (0.0 to 1.0).
 */
export function calculateSimilarity(textA: string, textB: string): number {
  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...setA, ...setB]).size;
  return intersectionCount / unionCount;
}

/**
 * Extracts a concise snippet from a longer body of text highlighting matched terms.
 */
export function extractSnippet(body: string, keywords: string[], maxLength = 220): string {
  const clean = cleanText(body);
  if (clean.length <= maxLength) return clean;

  const lower = clean.toLowerCase();
  let bestIndex = -1;

  for (const kw of keywords) {
    const idx = lower.indexOf(kw.toLowerCase());
    if (idx !== -1) {
      bestIndex = idx;
      break;
    }
  }

  if (bestIndex === -1) {
    return clean.slice(0, maxLength) + '...';
  }

  const start = Math.max(0, bestIndex - 40);
  const end = Math.min(clean.length, start + maxLength);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < clean.length ? '...' : '';

  return prefix + clean.slice(start, end).trim() + suffix;
}
