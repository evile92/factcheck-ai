import { NextRequest, NextResponse } from 'next/server';
import { globalClaimExtractor } from '@/services/claim-extractor';
import { globalReliabilityEngine } from '@/services/reliability-engine';
import { calculateSimilarity, cleanText } from '@/lib/text-utils';
import { ComparisonResult } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceA, sourceB } = body;

    if (!sourceA || !sourceB) {
      return NextResponse.json({ error: 'يرجى تقديم كلا المصدرين (المصدر أ والمصدر ب) للمقارنة.' }, { status: 400 });
    }

    const cleanA = cleanText(sourceA);
    const cleanB = cleanText(sourceB);

    // Extract claims from both sources
    const claimsA = globalClaimExtractor.extractClaims(cleanA);
    const claimsB = globalClaimExtractor.extractClaims(cleanB);

    const agreements: string[] = [];
    const divergences: string[] = [];

    // Compare claims across A and B
    for (const ca of claimsA) {
      let matched = false;
      for (const cb of claimsB) {
        const sim = calculateSimilarity(ca.text, cb.text);
        if (sim > 0.35) {
          agreements.push(`اتفاق في مضمون: "${ca.text.slice(0, 80)}..."`);
          matched = true;
          break;
        }
      }
      if (!matched && ca.text.length > 20) {
        divergences.push(`المصدر (أ) يدعي بشكل منفرد: "${ca.text.slice(0, 90)}..." (غير مذكور أو مخالف في المصدر ب).`);
      }
    }

    for (const cb of claimsB) {
      const isAlreadyCovered = agreements.some((ag) => ag.includes(cb.text.slice(0, 30)));
      if (!isAlreadyCovered && cb.text.length > 20) {
        divergences.push(`المصدر (ب) يذكر تفاصيل إضافية: "${cb.text.slice(0, 90)}...".`);
      }
    }

    // Default if completely different topics
    if (agreements.length === 0 && divergences.length === 0) {
      divergences.push('النصان يتناولان موضوعين مختلفين أو زوايا متباينة تماماً دون نقاط تقاطع واضحة.');
    }

    // Reliability comparison
    let domainA = 'نص مباشر أ';
    let domainB = 'نص مباشر ب';
    let scoreA = 0.6;
    let scoreB = 0.6;

    if (sourceA.startsWith('http')) {
      try {
        domainA = new URL(sourceA).hostname;
        scoreA = globalReliabilityEngine.evaluateSource(domainA).score;
      } catch {}
    }
    if (sourceB.startsWith('http')) {
      try {
        domainB = new URL(sourceB).hostname;
        scoreB = globalReliabilityEngine.evaluateSource(domainB).score;
      } catch {}
    }

    let strongerEvidence: 'sourceA' | 'sourceB' | 'neutral' | 'insufficient' = 'neutral';
    let strongerExplanation = 'كلا المصدرين متقاربان في معايير الصياغة والموثوقية.';

    if (scoreA > scoreB + 0.15) {
      strongerEvidence = 'sourceA';
      strongerExplanation = `المصدر (أ) [${domainA}] يتمتع بتصنيف موثوقية أعلى وأدلة أكثر استقراراً.`;
    } else if (scoreB > scoreA + 0.15) {
      strongerEvidence = 'sourceB';
      strongerExplanation = `المصدر (ب) [${domainB}] يعتمد على مرجعية أوثق وتغطية ذات أولوية.`;
    }

    const result: ComparisonResult = {
      id: `cmp-${Date.now()}`,
      sourceA: {
        input: cleanA.slice(0, 300),
        claims: claimsA.map((c) => c.text),
      },
      sourceB: {
        input: cleanB.slice(0, 300),
        claims: claimsB.map((c) => c.text),
      },
      agreements,
      divergences,
      strongerEvidence,
      strongerExplanation,
      verifiedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: `خطأ في المقارنة: ${err.message}` }, { status: 500 });
  }
}
