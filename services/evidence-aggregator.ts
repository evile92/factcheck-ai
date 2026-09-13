import { ContradictionItem, EvidenceItem, ExtractedClaim } from '@/types';
import { globalReliabilityEngine } from './reliability-engine';
import { calculateSimilarity, tokenize } from '@/lib/text-utils';
import { generateCrossLingualQueries } from '@/lib/language';

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

      // Compute semantic alignment with claims (including cross-lingual queries)
      let maxSimWithClaims = 0;
      let maxTokenRatio = 0;
      const evTokens = tokenize(item.sourceTitle + ' ' + item.sourceSnippet + ' ' + (item.claimedAspect || ''));

      for (const claim of claims) {
        const candidateTexts = [
          claim.text,
          ...(claim.searchQueries || []),
          ...generateCrossLingualQueries(claim.text, claim.language || 'ar'),
        ];

        for (const cand of candidateTexts) {
          const candTokens = tokenize(cand);
          let overlap = 0;
          for (const tok of candTokens) {
            if (evTokens.has(tok)) overlap++;
          }
          const tokenRatio = candTokens.size > 0 ? overlap / candTokens.size : 0;
          const sim = calculateSimilarity(cand, item.sourceTitle + ' ' + item.sourceSnippet);

          if (tokenRatio > maxTokenRatio) maxTokenRatio = tokenRatio;
          if (sim > maxSimWithClaims) maxSimWithClaims = sim;
        }
      }

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
          'نفت',
          'نفي',
          'لا صحة',
          'مزاعم',
          'مزعوم',
          'ادعاءات',
          'تكذيب',
          'تفنيد',
          'لم يمت',
          'حياً يرزق',
          'على قيد الحياة',
          'تراجع عن',
          'لا أساس له',
          'عار عن الصحة',
          'عاري عن الصحة',
          'فبركة',
          'تضليل',
          'مضلل',
          'سياق مضلل',
          'صورة قديمة',
          'فيديو قديم',
          'تحريف',
          'false',
          'fake',
          'hoax',
          'debunk',
          'debunked',
          'denies',
          'denied',
          'refutes',
          'untrue',
          'rumor',
          'rumours',
          'unfounded',
          'dismisses',
          'claims are false',
          'baseless',
          'fabricated',
          'misleading',
          'out of context',
          'doctored',
          'manipulated',
          'no evidence',
        ];

        // 2. Corroboration / Confirmation / Declarative Reporting patterns
        const confirmationPatterns = [
          // Arabic official, declarative & reporting verbs
          'أكدت',
          'أكد',
          'تأكيد',
          'صحيح',
          'رسمياً',
          'بيان رسمي',
          'إعلان رسمي',
          'وثائق تؤكد',
          'يعلن',
          'تعلن',
          'أعلن',
          'أعلنت',
          'إعلان',
          'صرح',
          'صرحت',
          'قال',
          'قالت',
          'أفاد',
          'أفادت',
          'أوضح',
          'أوضحت',
          'كشف',
          'كشفت',
          'نقل عن',
          'نقلت',
          'يرجح',
          'رجح',
          'رجحت',
          'يحمل',
          'حملت',
          'وقوف',
          'مسؤولية',
          'مقتل',
          'وفاة',
          'اغتيال',
          'استشهاد',
          'سقوط',
          'تأكد من مقتل',
          'تأكيد مقتل',
          'لقي حتفه',
          'رحيل',
          'إصابة',
          'إصابات',
          'استهداف',
          'هجوم',
          'قصف',
          'ضربة',
          'انفجار',
          'اعتداء',
          'توقيع',
          'اتفاق',
          'اتفاقية',
          'استقالة',
          'استقال',
          'اعتقال',
          'اعتقلت',
          'احتجاز',
          'محاكمة',
          'إدانة',
          'الحكم على',
          'فوز',
          'انتصار',
          'قرار',
          'إقرار',
          'مصادقة',
          // English reporting and attribution verbs
          'confirmed',
          'confirming',
          'confirms',
          'verified',
          'official statement',
          'officially',
          'announces',
          'announced',
          'announcement',
          'says',
          'said',
          'stated',
          'states',
          'reports',
          'reported',
          'revealed',
          'reveals',
          'according to',
          'likely',
          'probably',
          'responsible',
          'behind',
          'accuses',
          'accused',
          'blames',
          'blamed',
          'died',
          'killed',
          'assassinated',
          'assassination',
          'death of',
          'casualty',
          'casualties',
          'injured',
          'attack',
          'attacked',
          'strike',
          'struck',
          'targeted',
          'explosion',
          'blast',
          'agreement',
          'signed',
          'resigns',
          'resigned',
          'arrested',
          'convicted',
          'wins',
          'won',
          'approved',
          'passed',
        ];

        const hasRefutation = refutationPatterns.some((pattern) => text.includes(pattern));
        const hasConfirmation = confirmationPatterns.some((pattern) => text.includes(pattern));

        if (hasRefutation) {
          computedStance = 'refutes';
        } else if (
          // Condition 1: Direct confirmation / reporting keyword + at least minimal relevance to claims
          (hasConfirmation && (maxTokenRatio >= 0.2 || maxSimWithClaims >= 0.08 || claims.length === 0)) ||
          // Condition 2: High semantic match from credible news source (Tier 1-3) reporting on the claim
          (tier <= 3 && (maxTokenRatio >= 0.35 || maxSimWithClaims >= 0.18)) ||
          // Condition 3: Wikipedia biographical/historical confirmation
          (item.sourceType === 'wiki' &&
            (text.includes('اغتيال') ||
              text.includes('مقتل') ||
              text.includes('وفاة') ||
              text.includes('assassinated') ||
              text.includes('assassination') ||
              text.includes('killed') ||
              text.includes('death') ||
              maxTokenRatio >= 0.5))
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

    // 2. Rank evidence:
    // Live news agencies and accredited fact checkers take priority over static encyclopedic articles (Wikipedia)
    const rankedEvidence = uniqueItems.sort((a, b) => {
      const isLiveA = a.sourceType === 'news' || a.sourceType === 'factcheck';
      const isLiveB = b.sourceType === 'news' || b.sourceType === 'factcheck';

      // Always prioritize news agency reports over encyclopedic background
      if (isLiveA && !isLiveB && b.sourceType === 'wiki') {
        return -1;
      }
      if (isLiveB && !isLiveA && a.sourceType === 'wiki') {
        return 1;
      }

      // Active stance (supports / refutes) over neutral mention
      const activeA = a.stance === 'supports' || a.stance === 'refutes';
      const activeB = b.stance === 'supports' || b.stance === 'refutes';
      if (activeA && !activeB) return -1;
      if (!activeA && activeB) return 1;

      // Sort primarily by reliability score
      if (b.reliabilityScore !== a.reliabilityScore) {
        return b.reliabilityScore - a.reliabilityScore;
      }

      // Sort by date (most recent first)
      const dateA = a.sourceDate ? new Date(a.sourceDate).getTime() : 0;
      const dateB = b.sourceDate ? new Date(b.sourceDate).getTime() : 0;
      return dateB - dateA;
    });

    // 3. Map evidence items to claims
    for (const claim of claims) {
      const matchedIds: string[] = [];
      const candidateTexts = [
        claim.text,
        ...(claim.searchQueries || []),
        ...generateCrossLingualQueries(claim.text, claim.language || 'ar'),
      ];

      for (const ev of rankedEvidence) {
        const evTokens: Set<string> = tokenize(ev.sourceTitle + ' ' + ev.sourceSnippet + ' ' + (ev.claimedAspect || ''));
        let isMatch = false;

        for (const cand of candidateTexts) {
          const candTokens = tokenize(cand);
          let overlap = 0;
          for (const tok of candTokens) {
            if (evTokens.has(tok)) overlap++;
          }
          const tokenRatio = candTokens.size > 0 ? overlap / candTokens.size : 0;
          const sim = calculateSimilarity(cand, ev.sourceTitle + ' ' + ev.sourceSnippet);

          if (
            sim > 0.08 ||
            tokenRatio >= 0.35 ||
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
