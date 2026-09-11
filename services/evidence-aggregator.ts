import { ContradictionItem, EvidenceItem, ExtractedClaim } from '@/types';
import { globalReliabilityEngine } from './reliability-engine';
import { calculateSimilarity } from '@/lib/text-utils';

export class EvidenceAggregator {
  /**
   * Aggregates, deduplicates, and enriches evidence from all providers.
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
    // 1. Deduplicate by URL and title
    const seenUrls = new Set<string>();
    const uniqueItems: EvidenceItem[] = [];

    for (const item of rawItems) {
      if (!item.sourceUrl || !item.sourceTitle) continue;

      const normUrl = item.sourceUrl.replace(/[?#].*$/, '').toLowerCase();
      if (seenUrls.has(normUrl)) continue;
      seenUrls.add(normUrl);

      // Verify domain and recalculate reliability score
      const domain = item.sourceDomain || new URL(item.sourceUrl).hostname;
      const { tier, score } = globalReliabilityEngine.evaluateSource(domain, item.sourceType);

      // Determine stance based on snippet content relative to claims
      let computedStance = item.stance;
      if (computedStance === 'mentions') {
        const text = (item.sourceTitle + ' ' + item.sourceSnippet).toLowerCase();

        // 1. Refutation / Denial / Rumor patterns
        const refutationPatterns = [
          'غير صحيح',
          'كاذب',
          'مفبرك',
          'شائعة',
          'شائعات',
          'تنفي',
          'ينفي',
          'نفي',
          'لا صحة',
          'مزاعم',
          'ادعاءات',
          'تكذيب',
          'تفنيد',
          'لم يمت',
          'حياً يرزق',
          'على قيد الحياة',
          'تراجع عن',
          'false',
          'fake',
          'hoax',
          'debunk',
          'denies',
          'denied',
          'refutes',
          'untrue',
          'rumor',
          'rumours',
          'unfounded',
          'dismisses',
          'claims are false',
        ];

        // 2. Corroboration / Confirmation patterns
        const confirmationPatterns = [
          'أكدت',
          'أكد',
          'صحيح',
          'رسمياً',
          'بيان رسمي',
          'أعلن',
          'أعلنت',
          'مقتل',
          'وفاة',
          'اغتيال',
          'استشهاد',
          'سقوط',
          'تأكد من مقتل',
          'تأكيد مقتل',
          'لقي حتفه',
          'رحيل',
          'إعلان رسمي',
          'وثائق تؤكد',
          'يعلن',
          'تعلن',
          'confirmed',
          'verified',
          'official statement',
          'died',
          'killed',
          'assassinated',
          'death of',
        ];

        const hasRefutation = refutationPatterns.some((pattern) => text.includes(pattern));
        const hasConfirmation = confirmationPatterns.some((pattern) => text.includes(pattern));

        if (hasRefutation) {
          computedStance = 'refutes';
        } else if (
          hasConfirmation ||
          (item.sourceType === 'wiki' &&
            (text.includes('اغتيال') ||
              text.includes('مقتل') ||
              text.includes('وفاة') ||
              text.includes('assassinated') ||
              text.includes('assassination') ||
              text.includes('killed') ||
              text.includes('death')))
        ) {
          computedStance = 'supports';
        }
      }

      uniqueItems.push({
        ...item,
        sourceDomain: domain,
        tier,
        reliabilityScore: score,
        stance: computedStance,
      });
    }

    // 2. Rank evidence: higher tier, higher reliability score, recent date
    const rankedEvidence = uniqueItems.sort((a, b) => {
      // Sort primarily by reliability score
      if (b.reliabilityScore !== a.reliabilityScore) {
        return b.reliabilityScore - a.reliabilityScore;
      }
      // Sort by date if present
      const dateA = a.sourceDate ? new Date(a.sourceDate).getTime() : 0;
      const dateB = b.sourceDate ? new Date(b.sourceDate).getTime() : 0;
      return dateB - dateA;
    });

    // 3. Map evidence items to claims
    for (const claim of claims) {
      const matchedIds: string[] = [];
      const { tokenize } = require('@/lib/text-utils');
      const claimTokens: Set<string> = tokenize(claim.text);

      for (const ev of rankedEvidence) {
        const evTokens: Set<string> = tokenize(ev.sourceTitle + ' ' + ev.sourceSnippet);
        let overlap = 0;
        for (const tok of claimTokens) {
          if (evTokens.has(tok)) overlap++;
        }
        const tokenRatio = claimTokens.size > 0 ? overlap / claimTokens.size : 0;
        const sim = calculateSimilarity(claim.text, ev.sourceTitle + ' ' + ev.sourceSnippet);

        if (sim > 0.08 || tokenRatio >= 0.4 || ev.claimedAspect.includes(claim.text) || claim.text.includes(ev.claimedAspect)) {
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
        explanation = 'المصادر المستقلة متساوية في الموثوقية لكنها تختلف في التقييم أو زاوية التغطية.';
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
          stance: 'ينفي / يكذب',
          date: topRef.sourceDate,
          tier: topRef.tier,
        },
        explanation,
      });
    }

    // 5. Check Earliest Context / Context Recycling
    let earliestContext: {
      firstSeenDate?: string;
      firstSeenUrl?: string;
      originalContext?: string;
      isRecycled: boolean;
    } | undefined;

    const datesWithItems = rankedEvidence
      .filter((e) => e.sourceDate)
      .map((e) => ({ date: e.sourceDate!, item: e }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (datesWithItems.length > 0) {
      const earliest = datesWithItems[0];
      const earliestYear = new Date(earliest.date).getFullYear();
      const currentYear = new Date().getFullYear();

      // If earliest occurrence is more than 1 year older than current year, might be recycled
      const isRecycled = earliestYear < currentYear - 1;

      earliestContext = {
        firstSeenDate: earliest.date,
        firstSeenUrl: earliest.item.sourceUrl,
        originalContext: earliest.item.sourceTitle,
        isRecycled,
      };
    }

    return {
      rankedEvidence: rankedEvidence.slice(0, 10), // Return top 10 relevant items
      contradictions,
      earliestContext,
    };
  }
}

export const globalEvidenceAggregator = new EvidenceAggregator();
