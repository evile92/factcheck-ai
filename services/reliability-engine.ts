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
  // Wire agencies & accredited fact checkers
  'reuters.com',
  'apnews.com',
  'afp.com',
  'bbc.com',
  'bbc.co.uk',
  'factcheck.org',
  'snopes.com',
  'politifact.com',
  'fullfact.org',
  'mabda.org',
  'fatabyyano.net',
  'dabegat.org',
  'misbar.com',
  'tahayyaz.net',
  'wikipedia.org',
  'ar.wikipedia.org',
  'en.wikipedia.org',
]);

const TIER_3_DOMAINS = new Set([
  // Mainstream news media
  'aljazeera.net',
  'alarabiya.net',
  'france24.com',
  'dw.com',
  'skynewsarabia.com',
  'theguardian.com',
  'nytimes.com',
  'washingtonpost.com',
  'cnn.com',
  'bloomberg.com',
  'lemonde.fr',
  'elwatannews.com',
  'ahram.org.eg',
  'youm7.com',
]);

const SATIRE_AND_TIER_5_DOMAINS = new Set([
  'theonion.com',
  'babylonbee.com',
  'alhudood.net',
  'clickhole.com',
  'worldnewsdailyreport.com',
  'newspunch.com',
]);

export class SourceReliabilityEngine {
  /**
   * Evaluates domain credibility and assigns a tier (1 to 5) and base score (0.0 to 1.0).
   */
  evaluateSource(domain: string, sourceType?: string): { tier: SourceTier; score: number; isSatire: boolean } {
    const cleanDomain = domain.toLowerCase().replace(/^www\./, '');

    // Satire check
    if (SATIRE_AND_TIER_5_DOMAINS.has(cleanDomain)) {
      return { tier: 5, score: 0.15, isSatire: true };
    }

    // Tier 1: Government, Academic, Official Organizations
    if (
      TIER_1_DOMAINS.has(cleanDomain) ||
      cleanDomain.endsWith('.gov') ||
      cleanDomain.endsWith('.edu') ||
      cleanDomain.endsWith('.ac.uk') ||
      cleanDomain.endsWith('.gov.ae') ||
      cleanDomain.endsWith('.gov.sa') ||
      cleanDomain.endsWith('.gov.eg')
    ) {
      return { tier: 1, score: 0.95, isSatire: false };
    }

    // Tier 2: Wire services, certified fact-checkers, curated encyclopedias
    if (TIER_2_DOMAINS.has(cleanDomain) || cleanDomain.includes('factcheck') || cleanDomain.includes('wikipedia')) {
      return { tier: 2, score: 0.88, isSatire: false };
    }

    // Tier 3: Mainstream news outlets
    if (TIER_3_DOMAINS.has(cleanDomain)) {
      return { tier: 3, score: 0.75, isSatire: false };
    }

    // Fallbacks based on sourceType
    if (sourceType === 'official' || sourceType === 'academic') {
      return { tier: 1, score: 0.92, isSatire: false };
    }
    if (sourceType === 'factcheck') {
      return { tier: 2, score: 0.85, isSatire: false };
    }
    if (sourceType === 'news') {
      return { tier: 3, score: 0.68, isSatire: false };
    }

    // Default: Tier 4 for unvetted sources
    return { tier: 4, score: 0.45, isSatire: false };
  }
}

export const globalReliabilityEngine = new SourceReliabilityEngine();
