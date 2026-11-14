import { SourceTier } from '@/types';

// Curated lists of high-reliability and low-reliability domains
const TIER_1_DOMAINS = new Set([
  'who.int',
  'un.org',
  'cdc.gov',
  'nih.gov',
  'nasa.gov',
  'gov.uk',
  'whitehouse.gov',
  'worldbank.org',
  'imf.org',
  'unesco.org',
  'doi.org',
  'nature.com',
  'thelancet.com',
  'science.org',
  'ncbi.nlm.nih.gov',
]);

const TIER_2_DOMAINS = new Set([
  // Primary international wire services & accredited fact checkers
  'reuters.com',
  'apnews.com',
  'ap.org',
  'afp.com',
  'factcheck.afp.com',
  'bloomberg.com',
  'bbc.com',
  'bbc.co.uk',
  'dw.com',
  'spa.gov.sa',
  'wam.ae',
  'xinhuanet.com',
  'news.cn',
  'aa.com.tr',
  'factcheck.org',
  'snopes.com',
  'politifact.com',
  'fullfact.org',
  'mabda.org',
  'fatabyyano.net',
  'dabegat.org',
  'misbar.com',
  'tahayyaz.net',
  'verify-sy.com',
  'matsda2sh.com',
  'kashif.ps',
  'wikipedia.org',
]);

const TIER_3_DOMAINS = new Set([
  // Mainstream news media
  'aljazeera.net',
  'aljazeera.com',
  'france24.com',
  'skynewsarabia.com',
  'news.sky.com',
  'alarabiya.net',
  'theguardian.com',
  'nytimes.com',
  'washingtonpost.com',
  'cnn.com',
  'lemonde.fr',
  'asharq.com',
  'independent.co.uk',
  'independentarabia.com',
  'aawsat.com',
  'alquds.co.uk',
  'arabi21.com',
  'youm7.com',
  'ahram.org.eg',
  'elwatannews.com',
  'alhurra.com',
  'alhadath.net',
  'almasryalyoum.com',
  'shorouknews.com',
  'albayan.ae',
  'alkhaleej.ae',
  'echaab.dz',
]);

const SATIRE_AND_TIER_5_DOMAINS = new Set([
  'theonion.com',
  'babylonbee.com',
  'alhudood.net',
  'clickhole.com',
  'worldnewsdailyreport.com',
  'newspunch.com',
]);

const SOCIAL_AND_UGC_DOMAINS = new Set([
  'twitter.com',
  'x.com',
  'facebook.com',
  'fb.com',
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  't.me',
  'telegram.me',
  'reddit.com',
  'blogspot.com',
  'wordpress.com',
  'medium.com',
]);

function matchesDomainSet(domain: string, domainSet: Set<string>): boolean {
  if (domainSet.has(domain)) return true;
  for (const entry of domainSet) {
    if (domain.endsWith('.' + entry)) return true;
  }
  return false;
}

export class SourceReliabilityEngine {
  /**
   * Evaluates domain credibility and assigns a tier (1 to 5) and base score (0.0 to 1.0).
   */
  evaluateSource(domain: string, sourceType?: string): { tier: SourceTier; score: number; isSatire: boolean } {
    const cleanDomain = domain.toLowerCase().replace(/^www\./, '').trim();

    // Satire check (highest precedence)
    if (matchesDomainSet(cleanDomain, SATIRE_AND_TIER_5_DOMAINS)) {
      return { tier: 5, score: 0.15, isSatire: true };
    }

    // Social Media / User Generated Content (not independently vetted)
    if (sourceType === 'social' || matchesDomainSet(cleanDomain, SOCIAL_AND_UGC_DOMAINS)) {
      return { tier: 4, score: 0.35, isSatire: false };
    }

    // Tier 1: Government, Academic, Official Organizations
    if (
      matchesDomainSet(cleanDomain, TIER_1_DOMAINS) ||
      cleanDomain.endsWith('.gov') ||
      cleanDomain.endsWith('.edu') ||
      cleanDomain.endsWith('.ac.uk') ||
      cleanDomain.endsWith('.gov.ae') ||
      cleanDomain.endsWith('.gov.sa') ||
      cleanDomain.endsWith('.gov.eg') ||
      cleanDomain.endsWith('.gov.jo') ||
      cleanDomain.endsWith('.gov.qa')
    ) {
      return { tier: 1, score: 0.95, isSatire: false };
    }

    // Wikipedia: Curated encyclopedia reference (scored below live wire services)
    if (cleanDomain === 'wikipedia.org' || cleanDomain.endsWith('.wikipedia.org') || sourceType === 'wiki') {
      return { tier: 2, score: 0.78, isSatire: false };
    }

    // Tier 2: Primary wire services and accredited fact-checkers (highest priority for news)
    if (matchesDomainSet(cleanDomain, TIER_2_DOMAINS) || cleanDomain.includes('factcheck')) {
      return { tier: 2, score: 0.93, isSatire: false };
    }

    // Tier 3: Mainstream news outlets
    if (matchesDomainSet(cleanDomain, TIER_3_DOMAINS)) {
      return { tier: 3, score: 0.85, isSatire: false };
    }

    // Fallbacks based on sourceType
    if (sourceType === 'official' || sourceType === 'academic') {
      return { tier: 1, score: 0.92, isSatire: false };
    }
    if (sourceType === 'factcheck') {
      return { tier: 2, score: 0.88, isSatire: false };
    }
    if (sourceType === 'news' || cleanDomain.includes('news') || cleanDomain.includes('press')) {
      return { tier: 3, score: 0.78, isSatire: false };
    }

    // Default: Tier 4 for unvetted sources
    return { tier: 4, score: 0.45, isSatire: false };
  }
}

export const globalReliabilityEngine = new SourceReliabilityEngine();
