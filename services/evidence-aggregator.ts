import { ContradictionItem, EvidenceItem, ExtractedClaim } from '@/types';
import { globalReliabilityEngine } from './reliability-engine';
import {
  calculateSimilarity,
  extractNumericFacts,
  normalizeArabic,
  tokenize,
  tokenizeUniqueConcepts,
  toWesternDigits,
} from '@/lib/text-utils';
import { detectLanguage, generateCrossLingualQueries, getCrossLingualEquivalents } from '@/lib/language';

const POLARITY_OPPOSITE_PAIRS: Array<[string[], string[]]> = [
  // Rate / price / metric increase vs hold/cut
  [
    ['رفع', 'يرفع', 'رفعت', 'زيادة', 'ارتفاع', 'ارتفع', 'ارتفعت', 'raise', 'raises', 'raised', 'hike', 'hiked', 'increase', 'increased'],
    ['تثبيت', 'ثبت', 'ثبتت', 'دون تغيير', 'خفض', 'خفضت', 'تخفيض', 'انخفاض', 'تراجع', 'تراجعت', 'hold', 'holds', 'held', 'unchanged', 'pause', 'paused', 'cut', 'cuts', 'lowered', 'decrease', 'decreased'],
  ],
  // Cancel / ban / close vs continue / open
  [
    ['إلغاء', 'الغاء', 'ألغى', 'ألغت', 'حظر', 'إغلاق', 'اغلاق', 'أغلق', 'أغلقت', 'تعليق', 'cancel', 'cancelled', 'canceled', 'ban', 'banned', 'close', 'closed', 'suspend', 'suspended'],
    ['استمرار', 'يستمر', 'تستمر', 'مفتوح', 'فتح', 'استئناف', 'عدم إلغاء', 'نفي إلغاء', 'continue', 'continues', 'continued', 'remain open', 'reopen', 'resumed', 'no ban'],
  ],
  // Death vs alive
  [
    ['وفاة', 'مقتل', 'اغتيال', 'توفي', 'مات', 'استشهاد', 'لقي حتفه', 'died', 'dies', 'killed', 'assassinated', 'dead'],
    ['على قيد الحياة', 'حيا يرزق', 'حياً يرزق', 'حي يرزق', 'لم يمت', 'ظهر حيا', 'ظهر حياً', 'alive', 'survives', 'survived', 'unharmed'],
  ],
  // Universal / 100% cure vs preliminary / partial
  [
    ['نهائيا', 'نهائياً', 'نهائي', '100%', 'بشكل كامل', 'شامل', 'complete cure', '100 percent', 'permanent cure', 'final cure'],
    ['جزئي', 'جزئيا', 'جزئياً', 'أولية', 'اولية', 'تجارب أولية', 'مرحلة مبكرة', 'تجريبي', 'فئران', 'على الفئران', 'preliminary', 'early stage', 'experimental', 'partial', 'mice', 'animal trial', 'phase 1', 'no cure'],
  ],
];

function detectPolarityConflict(claimText: string, evidenceText: string): boolean {
  const cNorm = normalizeArabic(toWesternDigits(claimText)).toLowerCase();
  const eNorm = normalizeArabic(toWesternDigits(evidenceText)).toLowerCase();

  for (const [groupA, groupB] of POLARITY_OPPOSITE_PAIRS) {
    const normA = groupA.map((p) => normalizeArabic(p).toLowerCase());
    const normB = groupB.map((p) => normalizeArabic(p).toLowerCase());

    const claimHasA = normA.some((p) => cNorm.includes(p));
    const claimHasB = normB.some((p) => cNorm.includes(p));
    const evHasA = normA.some((p) => eNorm.includes(p));
    const evHasB = normB.some((p) => eNorm.includes(p));

    if (claimHasA && !claimHasB && evHasB && !evHasA) return true;
    if (claimHasB && !claimHasA && evHasA && !evHasB) return true;
  }
  return false;
}

function detectNumericConflict(claimText: string, evidenceText: string): boolean {
  const claimNums = extractNumericFacts(claimText).filter((n) => !n.isYear);
  const evNums = extractNumericFacts(evidenceText).filter((n) => !n.isYear);
  if (claimNums.length === 0 || evNums.length === 0) return false;

  // Compare percentage values specifically when both mention percentages
  const claimPercents = claimNums.filter((n) => n.isPercent);
  const evPercents = evNums.filter((n) => n.isPercent);
  if (claimPercents.length > 0 && evPercents.length > 0) {
    const anyPercentMatches = claimPercents.some((cp) =>
      evPercents.some((ep) => Math.abs(cp.value - ep.value) <= 5)
    );
    if (!anyPercentMatches) return true;
  }

  return false;
}

function computeClaimAlignment(
  claim: ExtractedClaim,
  evFullText: string,
  claimedAspect?: string
): {
  substantiveMatched: number;
  substantiveTotal: number;
  substantiveRatio: number;
  conceptMatched: number;
  conceptRatio: number;
  sim: number;
} {
  const evTextCombined = `${evFullText} ${claimedAspect || ''}`;
  const evConcepts = tokenizeUniqueConcepts(evTextCombined, false);
  const evTokensFull = tokenize(evTextCombined);
  const evLang = detectLanguage(evFullText).code;
  const claimLang = claim.language || detectLanguage(claim.text).code;
  const isCrossLingual = evLang !== claimLang;

  const allClaimConcepts = tokenizeUniqueConcepts(claim.text, false);
  const substantiveConcepts = tokenizeUniqueConcepts(claim.text, true);
  const effectiveSubstantive = substantiveConcepts.size > 0 ? substantiveConcepts : allClaimConcepts;

  const matchesConcept = (concept: string): boolean => {
    if (evConcepts.has(concept) || evTokensFull.has(concept)) return true;
    if (isCrossLingual) {
      const equivs = getCrossLingualEquivalents(concept, claimLang);
      for (const eq of equivs) {
        if (evConcepts.has(eq) || evTokensFull.has(eq)) return true;
      }
    }
    return false;
  };

  let substantiveMatched = 0;
  for (const c of effectiveSubstantive) {
    if (matchesConcept(c)) substantiveMatched++;
  }

  let conceptMatched = 0;
  for (const c of allClaimConcepts) {
    if (matchesConcept(c)) conceptMatched++;
  }

  const substantiveTotal = effectiveSubstantive.size;
  const substantiveRatio = substantiveTotal > 0 ? substantiveMatched / substantiveTotal : 0;
  const conceptRatio = allClaimConcepts.size > 0 ? conceptMatched / allClaimConcepts.size : 0;
  const sim = calculateSimilarity(claim.text, evFullText);

  return {
    substantiveMatched,
    substantiveTotal,
    substantiveRatio,
    conceptMatched,
    conceptRatio,
    sim,
  };
}

export class EvidenceAggregator {
  /**
   * Aggregates, deduplicates, filters irrelevant noise, and enriches evidence from all providers.
   */
  processEvidence(rawItems: EvidenceItem[], claims: ExtractedClaim[]): {
    rankedEvidence: EvidenceItem[];
    contradictions: ContradictionItem[];
    earliestContext?: {
      firstSeenDate?: string;
      firstSeenUrl?: string;
      originalContext?: string;
      isRecycled: boolean;
    };
  } {
    // 1. Deduplicate by URL and domain+title
    const seenUrls = new Set<string>();
    const seenDomainTitles = new Set<string>();
    const scoredItems: Array<{
      item: EvidenceItem;
      overlapCount: number;
      tokenRatio: number;
      substantiveMatched: number;
      substantiveTotal: number;
      substantiveRatio: number;
      sim: number;
    }> = [];

    for (const item of rawItems) {
      if (!item.sourceUrl || !item.sourceTitle) continue;

      const normUrl = item.sourceUrl.replace(/[?#].*$/, '').toLowerCase();
      if (seenUrls.has(normUrl)) continue;
      seenUrls.add(normUrl);

      // Verify domain and recalculate reliability score
      let domain = item.sourceDomain;
      if (!domain) {
        try {
          domain = new URL(item.sourceUrl).hostname;
        } catch {
          domain = 'unknown';
        }
      }

      const domainTitleKey = `${domain.toLowerCase()}::${normalizeArabic(item.sourceTitle).toLowerCase().slice(0, 70)}`;
      if (seenDomainTitles.has(domainTitleKey)) continue;
      seenDomainTitles.add(domainTitleKey);

      const { tier, score } = globalReliabilityEngine.evaluateSource(domain, item.sourceType);

      // Compute semantic alignment directly against each extracted claim (no subset-query inflation!)
      const evFullText = `${item.sourceTitle} ${item.sourceSnippet}`;
      let bestSim = 0;
      let bestConceptRatio = 0;
      let bestConceptMatched = 0;
      let bestSubstantiveMatched = 0;
      let bestSubstantiveTotal = 0;
      let bestSubstantiveRatio = 0;

      for (const claim of claims) {
        const align = computeClaimAlignment(claim, evFullText, item.claimedAspect);
        if (
          align.substantiveRatio > bestSubstantiveRatio ||
          (align.substantiveRatio === bestSubstantiveRatio && align.substantiveMatched > bestSubstantiveMatched)
        ) {
          bestSubstantiveMatched = align.substantiveMatched;
          bestSubstantiveTotal = align.substantiveTotal;
          bestSubstantiveRatio = align.substantiveRatio;
        }
        if (align.conceptMatched > bestConceptMatched) bestConceptMatched = align.conceptMatched;
        if (align.conceptRatio > bestConceptRatio) bestConceptRatio = align.conceptRatio;
        if (align.sim > bestSim) bestSim = align.sim;
      }

      // Strict Relevance Gate: prevent single-entity or off-topic articles from passing
      if (claims.length > 0 && item.sourceType !== 'factcheck') {
        if (item.sourceType === 'academic' && (bestSubstantiveMatched < 2 || bestSubstantiveRatio < 0.5)) {
          continue;
        }
        if (item.sourceType === 'wiki' && (bestSubstantiveMatched < 2 || bestSubstantiveRatio < 0.55)) {
          continue;
        }
        if (bestSubstantiveTotal <= 3) {
          // Short claims (<= 3 substantive concepts like "الصين + حرب + نسوية") require at least 2 distinct substantive concepts (>= 60%)
          const requiredCount = Math.min(2, bestSubstantiveTotal);
          if (bestSubstantiveMatched < requiredCount || bestSubstantiveRatio < 0.6) {
            continue;
          }
        } else {
          // Longer claims require at least 2 substantive concepts AND >= 40% substantive coverage
          if (bestSubstantiveMatched < 2 || bestSubstantiveRatio < 0.4) {
            continue;
          }
        }
      }

      // Determine stance based on refutation markers, polarity conflicts, numeric facts, and FULL topic coverage
      let computedStance = item.stance;
      if (computedStance === 'mentions') {
        const textNorm = normalizeArabic(toWesternDigits(evFullText)).toLowerCase();

        // 1. Refutation / Denial / Rumor / Exaggeration patterns
        const refutationPatterns = [
          'غير صحيح',
          'كاذب',
          'مفبرك',
          'شائعة',
          'شائعات',
          'اشاعة',
          'إشاعة',
          'تنفي',
          'ينفي',
          'نفت',
          'نفى',
          'نفي',
          'لا صحة',
          'مزاعم',
          'مزعوم',
          'ادعاءات',
          'تكذيب',
          'تفنيد',
          'لم يمت',
          'لم يحدث',
          'لم يصدر',
          'لم يعلن',
          'لم تعلن',
          'حياً يرزق',
          'حيا يرزق',
          'على قيد الحياة',
          'تراجع عن',
          'لا أساس له',
          'لا اساس له',
          'عار عن الصحة',
          'عاري عن الصحة',
          'فبركة',
          'تضليل',
          'مضلل',
          'سياق مضلل',
          'صورة قديمة',
          'فيديو قديم',
          'تحريف',
          'خبر زائف',
          'ادعاء باطل',
          'غير دقيق',
          'مبالغ فيه',
          'لا يوجد دليل',
          'تجارب أولية',
          'تجارب اولية',
          'على الفئران',
          'false',
          'fake',
          'hoax',
          'debunk',
          'debunked',
          'denies',
          'denied',
          'deny',
          'refutes',
          'refuted',
          'untrue',
          'rumor',
          'rumour',
          'rumors',
          'rumours',
          'unfounded',
          'dismisses',
          'dismissed',
          'claims are false',
          'baseless',
          'fabricated',
          'misleading',
          'out of context',
          'doctored',
          'manipulated',
          'no evidence',
          'not true',
          'did not',
          'never happened',
          'no cure',
          'preliminary',
          'in mice',
          'phase 1',
          'exaggerated',
        ].map((p) => normalizeArabic(p).toLowerCase());

        // 2. Explicit Confirmation / Corroboration patterns (NO generic reporting verbs like "تعلن" or "أعلن"!)
        const confirmationPatterns = [
          'أكدت',
          'أكد',
          'تأكيد',
          'صحيح',
          'رسمياً',
          'بيان رسمي',
          'إعلان رسمي',
          'وثائق تؤكد',
          'يرجح',
          'رجح',
          'رجحت',
          'وقوف',
          'مسؤولية',
          'تأكد من مقتل',
          'تأكيد مقتل',
          'confirmed',
          'confirming',
          'confirms',
          'verified',
          'official statement',
          'officially',
          'likely',
          'probably',
          'responsible',
          'behind',
        ].map((p) => normalizeArabic(p).toLowerCase());

        const hasRefutation = refutationPatterns.some((pattern) => textNorm.includes(pattern));
        const hasConfirmation = confirmationPatterns.some((pattern) => textNorm.includes(pattern));

        // Check polarity and numeric conflicts against primary claims
        const hasPolarityConflict =
          bestSubstantiveMatched >= 2 && claims.some((c) => detectPolarityConflict(c.text, evFullText));
        const hasNumericConflict =
          bestSubstantiveMatched >= 2 && claims.some((c) => detectNumericConflict(c.text, evFullText));

        // High topic coverage required before ANY source can corroborate ("supports") a claim
        const hasStrongTopicCoverage =
          claims.length === 0 ||
          (bestSubstantiveTotal <= 3
            ? bestSubstantiveMatched === bestSubstantiveTotal
            : bestSubstantiveMatched >= 3 && bestSubstantiveRatio >= 0.65);

        if (hasRefutation || hasPolarityConflict) {
          computedStance = 'refutes';
        } else if (hasNumericConflict) {
          computedStance = 'neutral';
        } else if (
          hasStrongTopicCoverage &&
          ((hasConfirmation && (claims.length === 0 || bestSubstantiveRatio >= 0.65)) ||
            (tier <= 3 && item.sourceType !== 'wiki' && item.sourceType !== 'academic' && bestSubstantiveRatio >= 0.7) ||
            (item.sourceType === 'wiki' && bestSubstantiveRatio >= 0.85))
        ) {
          computedStance = 'supports';
        }
      }

      scoredItems.push({
        item: {
          ...item,
          sourceDomain: domain,
          tier,
          reliabilityScore: score,
          stance: computedStance,
        },
        overlapCount: bestSubstantiveMatched,
        tokenRatio: bestSubstantiveRatio,
        substantiveMatched: bestSubstantiveMatched,
        substantiveTotal: bestSubstantiveTotal,
        substantiveRatio: bestSubstantiveRatio,
        sim: bestSim,
      });
    }

    // 2. Rank evidence:
    // Prioritize factcheck & live news with high relevance & active stance over static encyclopedias
    scoredItems.sort((aEntry, bEntry) => {
      const a = aEntry.item;
      const b = bEntry.item;

      const isLiveA = a.sourceType === 'news' || a.sourceType === 'factcheck' || a.sourceType === 'wire';
      const isLiveB = b.sourceType === 'news' || b.sourceType === 'factcheck' || b.sourceType === 'wire';

      if (isLiveA && !isLiveB && b.sourceType === 'wiki') return -1;
      if (isLiveB && !isLiveA && a.sourceType === 'wiki') return 1;

      // Active stance (supports / refutes) over neutral mention
      const activeA = a.stance === 'supports' || a.stance === 'refutes';
      const activeB = b.stance === 'supports' || b.stance === 'refutes';
      if (activeA && !activeB) return -1;
      if (!activeA && activeB) return 1;

      // Combine reliability and claim relevance
      const rankScoreA = a.reliabilityScore * 0.65 + Math.min(1, aEntry.tokenRatio) * 0.35;
      const rankScoreB = b.reliabilityScore * 0.65 + Math.min(1, bEntry.tokenRatio) * 0.35;
      if (Math.abs(rankScoreB - rankScoreA) > 0.04) {
        return rankScoreB - rankScoreA;
      }

      // Sort by date (most recent first)
      const dateA = a.sourceDate ? new Date(a.sourceDate).getTime() : 0;
      const dateB = b.sourceDate ? new Date(b.sourceDate).getTime() : 0;
      return dateB - dateA;
    });

    const rankedEvidence = scoredItems.map((s) => s.item);

    // 3. Map evidence items to claims
    for (const claim of claims) {
      const matchedIds: string[] = [];
      const candidateTexts = [
        claim.text,
        ...(claim.searchQueries || []),
        ...generateCrossLingualQueries(claim.text, claim.language || 'ar'),
      ];

      for (const ev of rankedEvidence) {
        const evTokens: Set<string> = tokenize(`${ev.sourceTitle} ${ev.sourceSnippet} ${ev.claimedAspect || ''}`);
        let isMatch = false;

        for (const cand of candidateTexts) {
          const candTokens = tokenize(cand);
          let overlap = 0;
          for (const tok of candTokens) {
            if (evTokens.has(tok)) overlap++;
          }
          const tokenRatio = candTokens.size > 0 ? overlap / candTokens.size : 0;
          const sim = calculateSimilarity(cand, `${ev.sourceTitle} ${ev.sourceSnippet}`);

          if (
            sim > 0.08 ||
            (overlap >= 2 && tokenRatio >= 0.35) ||
            (ev.claimedAspect && cand.includes(ev.claimedAspect)) ||
            (ev.claimedAspect && ev.claimedAspect.includes(cand))
          ) {
            isMatch = true;
            break;
          }
        }

        if (isMatch) {
          matchedIds.push(ev.id);
        }
      }
      claim.evidenceIds = matchedIds.slice(0, 6);
    }

    // 4. Detect Contradictions
    const contradictions: ContradictionItem[] = [];
    const supporting = rankedEvidence.filter((e) => e.stance === 'supports');
    const refuting = rankedEvidence.filter((e) => e.stance === 'refutes');

    if (supporting.length > 0 && refuting.length > 0) {
      const topSupp = supporting[0];
      const topRef = refuting[0];

      let explanation = 'هناك تباين واضح بين المصادر.';
      if (topSupp.tier < topRef.tier) {
        explanation = `المصدر الداعم (${topSupp.sourceDomain}) ينتمي لتصنيف موثوقية أعلى (المستوى ${topSupp.tier}) مقارنة بالمصدر النافي.`;
      } else if (topRef.tier < topSupp.tier) {
        explanation = `المصدر النافي (${topRef.sourceDomain}) ينتمي لتصنيف موثوقية أعلى (المستوى ${topRef.tier}) مقارنة بالمصدر الداعم.`;
      } else {
        explanation = 'المصادر المستقلة متقاربة في الموثوقية لكنها تختلف في التقييم أو تنفي تفاصيل أساسية في الادعاء.';
      }

      contradictions.push({
        claim: claims[0]?.text || 'الادعاء الرئيسي',
        sourceA: {
          name: topSupp.sourceDomain,
          url: topSupp.sourceUrl,
          stance: 'يدعم / يؤكد',
          date: topSupp.sourceDate,
          tier: topSupp.tier,
        },
        sourceB: {
          name: topRef.sourceDomain,
          url: topRef.sourceUrl,
          stance: 'ينفي / يعارض',
          date: topRef.sourceDate,
          tier: topRef.tier,
        },
        explanation,
      });
    }

    // 5. Check Earliest Context / Context Recycling (EXCLUDING static Wikipedia & Academic background papers!)
    let earliestContext: {
      firstSeenDate?: string;
      firstSeenUrl?: string;
      originalContext?: string;
      isRecycled: boolean;
    } | undefined;

    const currentYear = new Date().getFullYear();
    const nowMs = Date.now();
    const newsOrFactcheckScored = scoredItems.filter(
      (s) =>
        s.item.sourceDate &&
        (s.item.sourceType === 'news' || s.item.sourceType === 'factcheck' || s.item.sourceType === 'wire') &&
        (s.overlapCount >= 2 || s.item.sourceType === 'factcheck')
    );

    const datesWithItems = newsOrFactcheckScored
      .map((s) => ({ date: s.item.sourceDate!, item: s.item, ms: new Date(s.item.sourceDate!).getTime() }))
      .filter((d) => !isNaN(d.ms))
      .sort((a, b) => a.ms - b.ms);

    if (datesWithItems.length > 0) {
      const earliest = datesWithItems[0];
      const earliestYear = new Date(earliest.ms).getFullYear();
      const hasFreshNews = datesWithItems.some((d) => nowMs - d.ms < 180 * 86400 * 1000);
      const claimExplicitlyMentionsYear = claims.some((c) => c.text.includes(String(earliestYear)));
      const factCheckFlagsOldContext = rankedEvidence.some(
        (e) =>
          e.sourceType === 'factcheck' &&
          /(صورة قديمة|فيديو قديم|قديمة|معاد تدوير|سياق قديم|old photo|old video|out of context|recycled)/i.test(
            `${e.sourceTitle} ${e.sourceSnippet}`
          )
      );

      // Recycled only if explicitly flagged by a fact-checker OR all matching news coverage is >1 year old and not a fresh breaking story
      const isRecycled =
        factCheckFlagsOldContext ||
        (earliestYear < currentYear - 1 && !hasFreshNews && !claimExplicitlyMentionsYear);

      earliestContext = {
        firstSeenDate: earliest.date,
        firstSeenUrl: earliest.item.sourceUrl,
        originalContext: earliest.item.sourceTitle,
        isRecycled,
      };
    }

    return {
      rankedEvidence: rankedEvidence.slice(0, 10),
      contradictions,
      earliestContext,
    };
  }
}

export const globalEvidenceAggregator = new EvidenceAggregator();
