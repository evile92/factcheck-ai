import { describe, it, expect } from 'vitest';
import { toWesternDigits, formatDisplayDate } from '../lib/text-utils';

describe('Text & Numeral Utilities (Western Digit Enforcement)', () => {
  it('converts Eastern Arabic / Hindi digits to Western digits', () => {
    expect(toWesternDigits('١٢٣٤٥٦٧٨٩٠')).toBe('1234567890');
    expect(toWesternDigits('مصر ٢٠٢٦ - نسبة ٩٩٪')).toBe('مصر 2026 - نسبة 99٪');
    expect(toWesternDigits('45678')).toBe('45678');
    expect(toWesternDigits(12345)).toBe('12345');
  });

  it('converts Persian/Urdu digits to Western digits', () => {
    expect(toWesternDigits('۱۲۳۴۵۶۷۸۹۰')).toBe('1234567890');
  });

  it('formats Arabic dates strictly with Western digits', () => {
    const fixedDate = new Date('2026-09-11T12:00:00Z');
    const formattedAr = formatDisplayDate(fixedDate, 'ar');
    expect(formattedAr).toMatch(/2026/);
    expect(formattedAr).not.toMatch(/[٠-٩]/);
  });

  it('formats English dates properly', () => {
    const fixedDate = new Date('2026-09-11T12:00:00Z');
    const formattedEn = formatDisplayDate(fixedDate, 'en');
    expect(formattedEn).toMatch(/2026/);
    expect(formattedEn).toMatch(/September/i);
  });

  it('generates bilingual search queries for Arabic input', async () => {
    const { getBilingualQueries } = await import('../lib/language');
    const { arQuery, enQuery } = await getBilingualQueries('اغتيال خامنئي في طهران', 'ar');
    expect(arQuery).toContain('خامنئي');
    expect(enQuery.toLowerCase()).toMatch(/khamenei|assassination/i);
  });

  it('generates bilingual search queries for English input', async () => {
    const { getBilingualQueries } = await import('../lib/language');
    const { arQuery, enQuery } = await getBilingualQueries('WHO announces cure for cancer', 'en');
    expect(enQuery).toContain('cancer');
    expect(arQuery).toMatch(/سرطان|علاج/);
  });
});
