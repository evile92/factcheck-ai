import {
  ContradictionItem,
  EvidenceItem,
  ExtractedClaim,
  ImageAnalysisResult,
  VerdictType,
  VideoAnalysisResult,
} from '@/types';

export interface VerdictOutput {
  verdict: VerdictType;
  verdictLabelAr: string;
  verdictLabelEn: string;
  confidence: number;
  confidenceDisclaimer: string;
  summary: string;
}

export class VerdictEngine {
  /**
   * Evaluates evidence, contradictions, media forensic data, and claims to issue the final objective verdict.
   */
  evaluate(
    claims: ExtractedClaim[],
    evidence: EvidenceItem[],
    contradictions: ContradictionItem[] = [],
    media?: { image?: ImageAnalysisResult; video?: VideoAnalysisResult },
    earliestContext?: { isRecycled: boolean; firstSeenDate?: string }
  ): VerdictOutput {
    const disclaimer =
      'نسبة الثقة تعكس درجة توافق الأدلة المسترجعة وموثوقية المصادر في هذه اللحظة، وليست حقيقة مطلقة.';

    // Check if satire
    const isSatireClaim = claims.some((c) => c.category === 'سخرية / Satire');
    const hasSatireSource = evidence.some((e) => e.tier === 5 && e.sourceDomain.includes('onion'));

    if (isSatireClaim || hasSatireSource) {
      return {
        verdict: 'MISLEADING',
        verdictLabelAr: 'محتوى ساخر / غير حقيقي',
        verdictLabelEn: 'SATIRE / PARODY',
        confidence: 90,
        confidenceDisclaimer: disclaimer,
        summary: 'المحتوى منشور في الأصل على موقع أو سياق ساخر (Parody)، ولا يمثل خبراً واقعياً أو تقريراً حقيقياً.',
      };
    }

    // Rule 1: No evidence or very weak evidence -> UNVERIFIED
    if (evidence.length === 0) {
      return {
        verdict: 'UNVERIFIED',
        verdictLabelAr: 'غير مؤكد — لا توجد أدلة كافية',
        verdictLabelEn: 'UNVERIFIED',
        confidence: 20,
        confidenceDisclaimer: disclaimer,
        summary:
          'لم يتم العثور على مصادر مستقلة أو وثائق رسمية كافية لتأكيد هذا الادعاء أو نفيه بشكل قاطع حتى هذه اللحظة.',
      };
    }

    // Rule 2: Check for Context Recycling (e.g. old video/image re-circulated as breaking news)
    if (earliestContext?.isRecycled) {
      return {
        verdict: 'MISLEADING',
        verdictLabelAr: 'مضلل — سياق قديم معاد تدويره',
        verdictLabelEn: 'MISLEADING CONTEXT',
        confidence: 88,
        confidenceDisclaimer: disclaimer,
        summary: `المحتوى أو الحدث حقيقي جزئياً، لكنه يعود إلى تاريخ سابق (${earliestContext.firstSeenDate || 'سنوات سابقة'}) وتم تداوله بشكل مضلل كحدث جديد.`,
      };
    }

    // Rule 3: Analyze Evidence Stance Distribution and Tier Weights
    let supportWeight = 0;
    let refuteWeight = 0;
    let neutralWeight = 0;

    const supportingItems = evidence.filter((e) => e.stance === 'supports');
    const refutingItems = evidence.filter((e) => e.stance === 'refutes');

    for (const item of evidence) {
      const weight = item.reliabilityScore;
      if (item.stance === 'supports') {
        supportWeight += weight;
      } else if (item.stance === 'refutes') {
        refuteWeight += weight;
      } else {
        neutralWeight += weight * 0.4;
      }
    }

    const totalWeight = supportWeight + refuteWeight + neutralWeight;

    // Check if fact-checkers specifically refuted it
    const factCheckRefutes = evidence.some(
      (e) => e.sourceType === 'factcheck' && (e.stance === 'refutes' || e.sourceSnippet.toLowerCase().includes('كاذب'))
    );

    if (factCheckRefutes || (refuteWeight > supportWeight && refuteWeight > 1.2)) {
      const conf = Math.min(96, Math.max(70, Math.round((refuteWeight / (refuteWeight + supportWeight || 1)) * 100)));
      return {
        verdict: 'FALSE',
        verdictLabelAr: 'كاذب / غير صحيح',
        verdictLabelEn: 'FALSE',
        confidence: conf,
        confidenceDisclaimer: disclaimer,
        summary: `تؤكد التحقيقات وتقارير التحقق المسترجعة عدم صحة هذا الادعاء مع نفي رسمي من مصادر موثوقة.`,
      };
    }

    // Identify major international wires, primary official sources, and mainstream news
    const majorWiresSupporting = supportingItems.filter(
      (e) =>
        (e.tier === 1 || e.tier === 2) &&
        (e.sourceType === 'wire' || e.sourceType === 'news' || e.sourceType === 'official' || e.sourceType === 'factcheck')
    );
    const reputableNewsSupporting = supportingItems.filter((e) => e.tier <= 3);

    // Case 1: Wire Consensus - Multiple independent major wires or accredited news confirming without refutation
    if (refuteWeight === 0 && (majorWiresSupporting.length >= 2 || (reputableNewsSupporting.length >= 2 && supportWeight >= 1.4))) {
      const conf = Math.min(96, Math.max(85, Math.round((supportWeight / (supportWeight + 0.15)) * 100)));
      return {
        verdict: 'TRUE',
        verdictLabelAr: 'صحيح ومؤكد — إجماع إخباري موثق',
        verdictLabelEn: 'VERIFIED TRUE',
        confidence: conf,
        confidenceDisclaimer: disclaimer,
        summary: 'تم تأكيد هذا الادعاء عبر إجماع وتغطية متطابقة من وكالات أنباء ومصادر إخبارية دولية معتمدة.',
      };
    }

    // Case 2: Strong general support (even if minor refute exists but support heavily dominates)
    if (supportWeight > 1.5 && supportWeight > refuteWeight * 2) {
      const conf = Math.min(95, Math.max(70, Math.round((supportWeight / (supportWeight + refuteWeight || 1)) * 100)));
      return {
        verdict: 'TRUE',
        verdictLabelAr: 'صحيح ومؤكد',
        verdictLabelEn: 'TRUE',
        confidence: conf,
        confidenceDisclaimer: disclaimer,
        summary: `تم تأكيد هذا الادعاء عبر مصادر رسمية وتقارير إخبارية مستقلة وموثقة.`,
      };
    }

    // Case 3: Single major reputable wire / official source without refutation
    if (refuteWeight === 0 && supportWeight >= 0.8 && reputableNewsSupporting.length >= 1) {
      const conf = Math.min(88, Math.max(72, Math.round((supportWeight / (supportWeight + 0.35)) * 100)));
      return {
        verdict: 'TRUE',
        verdictLabelAr: 'صحيح — تقارير إخبارية معتمدة',
        verdictLabelEn: 'VERIFIED TRUE',
        confidence: conf,
        confidenceDisclaimer: disclaimer,
        summary: 'الخبر مؤكد استناداً إلى تقارير موثوقة من وكالات الأنباء المعتمدة مع غياب أي نفي رسمي.',
      };
    }

    // Check if partly true or misleading
    if (supportWeight > 0.8 && refuteWeight > 0.8) {
      return {
        verdict: 'PARTLY_TRUE',
        verdictLabelAr: 'صحيح جزئياً / متباين',
        verdictLabelEn: 'PARTLY TRUE',
        confidence: 65,
        confidenceDisclaimer: disclaimer,
        summary:
          'هناك عناصر صحيحة في الخبر، لكن التفاصيل تتضمن مبالغات أو تباين في أرقام وتفسيرات المصادر المختلفة.',
      };
    }

    // If media indicates heavy manipulation
    if (media?.image && media.image.aiProbabilityScore > 80) {
      return {
        verdict: 'MISLEADING',
        verdictLabelAr: 'مضلل — مؤشرات تعديل بصري',
        verdictLabelEn: 'MISLEADING MEDIA',
        confidence: 78,
        confidenceDisclaimer: disclaimer,
        summary: 'توجد مؤشرات فنية على تعديل رقمي أو توليد بالذكاء الاصطناعي للصورة، مما يجعل الادعاء المرتبط بها غير موثوق.',
      };
    }

    // Fallback if not enough conclusive stance
    return {
      verdict: 'UNVERIFIED',
      verdictLabelAr: 'غير مؤكد — قيد المتابعة',
      verdictLabelEn: 'UNVERIFIED',
      confidence: 45,
      confidenceDisclaimer: disclaimer,
      summary:
        'الخبر متداول في تقارير إعلامية ولكن دون صدور بيان قاطع من المصادر الأولية أو وكالات التحقق المتخصصة.',
    };
  }
}

export const globalVerdictEngine = new VerdictEngine();
