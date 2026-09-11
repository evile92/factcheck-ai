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
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Normalizes Arabic characters (Hamzas, Teh Marbuta, Alef Maqsura).
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[إأآءئؤ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, ''); // Remove Arabic tashkeel (diacritics)
}

/**
 * Tokenize string into a set of normalized words for semantic similarity matching.
 */
export function tokenize(str: string): Set<string> {
  const normalized = normalizeArabic(str)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim();
  const words = normalized.split(/\s+/).filter((w) => w.length > 2);
  const tokenSet = new Set<string>();

  for (const w of words) {
    tokenSet.add(w);
    // Strip common Arabic prefixes (ال, ف, و, ب, ل) if word is long enough
    if (w.startsWith('ال') && w.length > 4) {
      tokenSet.add(w.slice(2));
    }
    if ((w.startsWith('و') || w.startsWith('ف') || w.startsWith('ب') || w.startsWith('ل')) && w.length > 4) {
      tokenSet.add(w.slice(1));
    }
  }

  return tokenSet;
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
