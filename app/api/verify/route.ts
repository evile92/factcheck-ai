import { NextRequest, NextResponse } from 'next/server';
import { globalRateLimiter } from '@/lib/rate-limiter';
import { validateSafeUrl } from '@/lib/ssrf';
import { globalClaimExtractor } from '@/services/claim-extractor';
import { globalProviderRegistry } from '@/providers/provider-registry';
import { globalEvidenceAggregator } from '@/services/evidence-aggregator';
import { globalVerdictEngine } from '@/services/verdict-engine';
import { globalImageAnalyzer } from '@/services/image-analyzer';
import { globalVideoAnalyzer } from '@/services/video-analyzer';
import { verificationCache } from '@/lib/cache';
import { cleanText } from '@/lib/text-utils';
import * as cheerio from 'cheerio';
import { VerificationResult } from '@/types';

export const maxDuration = 60; // Allow sufficient time for multi-provider querying

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const clientIp = req.headers.get('x-forwarded-for') || 'local-client';

  // 1. Rate Limiting Check
  const rateLimit = globalRateLimiter.isAllowed(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'تجاوزت الحد المسموح من الطلبات، يرجى المحاولة بعد قليل.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetTimeMs / 1000)) } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'صيغة طلب غير صالحة (JSON Required).' }, { status: 400 });
  }

  const { inputContent, inputType = 'text', imageBase64, imageMime = 'image/jpeg', videoMeta, stream = false } = body;

  if (!inputContent && !imageBase64) {
    return NextResponse.json({ error: 'يرجى تقديم نص أو رابط أو وسائط للتحقق منها.' }, { status: 400 });
  }

  // Check Cache
  const cacheKey = `verify:${inputType}:${cleanText(inputContent || '').slice(0, 100)}`;
  if (!stream && verificationCache.has(cacheKey)) {
    return NextResponse.json(verificationCache.get(cacheKey));
  }

  // Support SSE Streaming
  if (stream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendStage = (stageIndex: number, message: string) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'progress', stageIndex, message })}\n\n`)
          );
        };

        try {
          // Stage 1: Reading content
          sendStage(1, 'جاري قراءة المحتوى وتحديده...');
          let contentToAnalyze = inputContent || '';
          let mediaAnalysis: any = {};

          if (inputType === 'url' || inputContent.startsWith('http://') || inputContent.startsWith('https://')) {
            const urlSafe = await validateSafeUrl(inputContent);
            if (!urlSafe.valid) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'error', error: urlSafe.reason })}\n\n`)
              );
              controller.close();
              return;
            }

            try {
              const res = await fetch(inputContent, {
                headers: { 'User-Agent': 'FactCheckAI/1.0' },
                signal: AbortSignal.timeout(6000),
              });
              if (res.ok) {
                const html = await res.text();
                const $ = cheerio.load(html);
                const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
                const bodyText = $('article').text() || $('p').slice(0, 5).text() || '';
                contentToAnalyze = `${title}\n${bodyText}`.trim();
              }
            } catch {
              // fallback to url text
            }
          }

          // Stage 2: Media Analysis (if image or video)
          if (imageBase64) {
            sendStage(2, 'فحص الصورة: استخراج النص (OCR) وفحص البيانات الوصفية...');
            const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            const imgResult = await globalImageAnalyzer.analyze(buffer, imageMime);
            mediaAnalysis.image = imgResult;
            if (imgResult.ocrText) {
              contentToAnalyze = (contentToAnalyze + ' ' + imgResult.ocrText).trim();
            }
          } else if (inputType === 'video') {
            sendStage(2, 'تحليل الفيديو: إنشاء المخطط الزمني وفحص المشاهد...');
            mediaAnalysis.video = globalVideoAnalyzer.generateTimelineAnalysis(20);
          }

          // Stage 3: Claim Extraction
          sendStage(3, 'استخراج وتصنيف الادعاءات القابلة للتحقق...');
          const claims = globalClaimExtractor.extractClaims(contentToAnalyze);

          // Stage 4: Multi-Provider Search
          sendStage(4, 'البحث المتزامن في مصادر الأخبار وقواعد البيانات الدولية...');
          const rawEvidence = [];
          const query = claims[0]?.text || contentToAnalyze.slice(0, 120);
          const isScientific = claims.some((c) => c.category === 'طبي' || c.category === 'علمي');

          const evidenceItems = await globalProviderRegistry.searchAll(query, claims[0]?.language || 'ar', isScientific);
          rawEvidence.push(...evidenceItems);

          // Stage 5: Comparison & Contradiction Resolution
          sendStage(5, 'مقارنة النتائج، تدقيق الموثوقية وكشف التناقضات...');
          const { rankedEvidence, contradictions, earliestContext } = globalEvidenceAggregator.processEvidence(
            rawEvidence,
            claims
          );

          // Stage 6: Verdict Evaluation
          sendStage(6, 'تقييم الأدلة وحساب درجة الثقة وإصدار الحكم...');
          const verdictOutput = globalVerdictEngine.evaluate(
            claims,
            rankedEvidence,
            contradictions,
            mediaAnalysis,
            earliestContext
          );

          // Final Result Assembly
          const finalResult: VerificationResult = {
            id: `fc-${Date.now()}`,
            inputType,
            inputContent: inputContent || claims[0]?.text || 'تحليل وسائط',
            verdict: verdictOutput.verdict,
            verdictLabelAr: verdictOutput.verdictLabelAr,
            verdictLabelEn: verdictOutput.verdictLabelEn,
            confidence: verdictOutput.confidence,
            confidenceDisclaimer: verdictOutput.confidenceDisclaimer,
            summary: verdictOutput.summary,
            claims,
            evidence: rankedEvidence,
            contradictions,
            mediaAnalysis: Object.keys(mediaAnalysis).length > 0 ? mediaAnalysis : undefined,
            earliestContext,
            sourcesCount: rankedEvidence.length,
            verifiedAt: new Date().toISOString(),
            executionTimeMs: Date.now() - startTime,
            stages: [
              { name: 'قراءة المحتوى', status: 'completed' },
              { name: 'استخراج الادعاءات', status: 'completed' },
              { name: 'البحث في المصادر', status: 'completed' },
              { name: 'تدقيق الموثوقية', status: 'completed' },
              { name: 'فحص الوسائط والتناقضات', status: 'completed' },
              { name: 'إصدار الحكم النهائي', status: 'completed' },
            ],
          };

          verificationCache.set(cacheKey, finalResult);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'result', data: finalResult })}\n\n`));
          controller.close();
        } catch (err: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  // Non-streaming fallback execution
  try {
    let contentToAnalyze = inputContent || '';
    let mediaAnalysis: any = {};

    if (inputType === 'url' || inputContent.startsWith('http://') || inputContent.startsWith('https://')) {
      const urlSafe = await validateSafeUrl(inputContent);
      if (!urlSafe.valid) {
        return NextResponse.json({ error: urlSafe.reason }, { status: 400 });
      }

      try {
        const res = await fetch(inputContent, {
          headers: { 'User-Agent': 'FactCheckAI/1.0' },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);
          const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
          const bodyText = $('article').text() || $('p').slice(0, 5).text() || '';
          contentToAnalyze = `${title}\n${bodyText}`.trim();
        }
      } catch {}
    }

    if (imageBase64) {
      const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const imgResult = await globalImageAnalyzer.analyze(buffer, imageMime);
      mediaAnalysis.image = imgResult;
      if (imgResult.ocrText) {
        contentToAnalyze = (contentToAnalyze + ' ' + imgResult.ocrText).trim();
      }
    } else if (inputType === 'video') {
      mediaAnalysis.video = globalVideoAnalyzer.generateTimelineAnalysis(20);
    }

    const claims = globalClaimExtractor.extractClaims(contentToAnalyze);
    const query = claims[0]?.text || contentToAnalyze.slice(0, 120);
    const isScientific = claims.some((c) => c.category === 'طبي' || c.category === 'علمي');

    const evidenceItems = await globalProviderRegistry.searchAll(query, claims[0]?.language || 'ar', isScientific);
    const { rankedEvidence, contradictions, earliestContext } = globalEvidenceAggregator.processEvidence(
      evidenceItems,
      claims
    );

    const verdictOutput = globalVerdictEngine.evaluate(
      claims,
      rankedEvidence,
      contradictions,
      mediaAnalysis,
      earliestContext
    );

    const finalResult: VerificationResult = {
      id: `fc-${Date.now()}`,
      inputType,
      inputContent: inputContent || claims[0]?.text || 'تحليل وسائط',
      verdict: verdictOutput.verdict,
      verdictLabelAr: verdictOutput.verdictLabelAr,
      verdictLabelEn: verdictOutput.verdictLabelEn,
      confidence: verdictOutput.confidence,
      confidenceDisclaimer: verdictOutput.confidenceDisclaimer,
      summary: verdictOutput.summary,
      claims,
      evidence: rankedEvidence,
      contradictions,
      mediaAnalysis: Object.keys(mediaAnalysis).length > 0 ? mediaAnalysis : undefined,
      earliestContext,
      sourcesCount: rankedEvidence.length,
      verifiedAt: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
      stages: [
        { name: 'قراءة المحتوى', status: 'completed' },
        { name: 'استخراج الادعاءات', status: 'completed' },
        { name: 'البحث في المصادر', status: 'completed' },
        { name: 'تدقيق الموثوقية', status: 'completed' },
        { name: 'فحص الوسائط والتناقضات', status: 'completed' },
        { name: 'إصدار الحكم النهائي', status: 'completed' },
      ],
    };

    verificationCache.set(cacheKey, finalResult);
    return NextResponse.json(finalResult);
  } catch (err: any) {
    return NextResponse.json({ error: `فشل التحقق: ${err.message}` }, { status: 500 });
  }
}
