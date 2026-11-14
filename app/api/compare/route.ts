import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { globalClaimExtractor } from '@/services/claim-extractor';
import { globalReliabilityEngine } from '@/services/reliability-engine';
import { calculateSimilarity, cleanText } from '@/lib/text-utils';
import { safeFetchText } from '@/lib/ssrf';
import { ComparisonResult } from '@/types';

async function resolveSourceContent(rawInput: string): Promise<{
  text: string;
  domain: string;
  title?: string;
  score: number;
  error?: string;
}> {
  const trimmed = rawInput.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const res = await safeFetchText(trimmed, { timeoutMs: 6000 });
    if (!res.ok) {
      return {
        text: '',
        domain: 'رابط محظور أو غير متاح',
        score: 0.4,
        error: res.error || 'تعذر جلب محتوى الرابط',
      };
    }

    let domain = 'unknown';
    try {
      domain = new URL(res.finalUrl).hostname.replace(/^www\./, '');
    } catch {}

    const $ = cheerio.load(res.text);
    $('script, style, noscript, nav, footer').remove();
    const title = cleanText($('meta[property="og:title"]').attr('content') || $('title').text() || '');
    const body = cleanText(
      $('article').text() ||
        $('main').text() ||
        $('p')
          .slice(0, 8)
          .map((_, el) => $(el).text())
          .get()
          .join(' ')
    );

    const combinedText = cleanText(`${title}. ${body}`).slice(0, 2500);
    const { score } = globalReliabilityEngine.evaluateSource(domain);

    return {
      text: combinedText || trimmed,
      domain,
      title: title || domain,
      score,
    };
  }

  return {
    text: cleanText(trimmed),
    domain: 'نص مباشر',
    score: 0.6,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceA, sourceB } = body;

    if (!sourceA || !sourceB) {
      return NextResponse.json({ error: 'يرجى تقديم كلا المصدرين (المصدر أ والمصدر ب) للمقارنة.' }, { status: 400 });
    }

    const [resolvedA, resolvedB] = await Promise.all([
      resolveSourceContent(String(sourceA)),
      resolveSourceContent(String(sourceB)),
    ]);

    if (resolvedA.error) {
      return NextResponse.json({ error: `المصدر (أ): ${resolvedA.error}` }, { status: 400 });
    }
    if (resolvedB.error) {
      return NextResponse.json({ error: `المصدر (ب): ${resolvedB.error}` }, { status: 400 });
    }

    // Extract claims from both sources
    const claimsA = globalClaimExtractor.extractClaims(resolvedA.text);
    const claimsB = globalClaimExtractor.extractClaims(resolvedB.text);

    const agreements: string[] = [];
    const divergences: string[] = [];
    const matchedBIndices = new Set<number>();

    // Bidirectional comparison of claims across A and B
    for (const ca of claimsA) {
      let matched = false;
      for (let j = 0; j < claimsB.length; j++) {
        const cb = claimsB[j];
        const sim = calculateSimilarity(ca.text, cb.text);
        if (sim > 0.3) {
          agreements.push(`اتفاق في مضمون: "${ca.text.slice(0, 100)}${ca.text.length > 100 ? '...' : ''}"`);
          matched = true;
          matchedBIndices.add(j);
          break;
        }
      }
      if (!matched && ca.text.length > 20) {
        divergences.push(
          `المصدر (أ) يذكر بشكل منفرد: "${ca.text.slice(0, 100)}${ca.text.length > 100 ? '...' : ''}".`
        );
      }
    }

    for (let j = 0; j < claimsB.length; j++) {
      if (matchedBIndices.has(j)) continue;
      const cb = claimsB[j];
      if (cb.text.length > 20) {
        divergences.push(
          `المصدر (ب) يذكر تفاصيل إضافية/مختلفة: "${cb.text.slice(0, 100)}${cb.text.length > 100 ? '...' : ''}".`
        );
      }
    }

    if (agreements.length === 0 && divergences.length === 0) {
      divergences.push('النصان يتناولان موضوعين مختلفين أو زوايا متباينة تماماً دون نقاط تقاطع واضحة.');
    }

    const domainA = resolvedA.domain === 'نص مباشر' ? 'نص مباشر أ' : resolvedA.domain;
    const domainB = resolvedB.domain === 'نص مباشر' ? 'نص مباشر ب' : resolvedB.domain;

    let strongerEvidence: 'sourceA' | 'sourceB' | 'neutral' | 'insufficient' = 'neutral';
    let strongerExplanation = 'كلا المصدرين متقاربان في معايير الصياغة والموثوقية.';

    if (resolvedA.score > resolvedB.score + 0.15) {
      strongerEvidence = 'sourceA';
      strongerExplanation = `المصدر (أ) [${domainA}] يتمتع بتصنيف موثوقية أعلى وأدلة أكثر استقراراً.`;
    } else if (resolvedB.score > resolvedA.score + 0.15) {
      strongerEvidence = 'sourceB';
      strongerExplanation = `المصدر (ب) [${domainB}] يعتمد على مرجعية أوثق وتغطية ذات أولوية.`;
    }

    const result: ComparisonResult = {
      id: `cmp-${Date.now()}`,
      sourceA: {
        input: resolvedA.text.slice(0, 300),
        title: resolvedA.title,
        claims: claimsA.map((c) => c.text),
      },
      sourceB: {
        input: resolvedB.text.slice(0, 300),
        title: resolvedB.title,
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
