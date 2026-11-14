import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { globalRateLimiter } from '@/lib/rate-limiter';
import { safeFetchText, validateSafeUrl } from '@/lib/ssrf';
import { globalClaimExtractor } from '@/services/claim-extractor';
import { globalProviderRegistry } from '@/providers/provider-registry';
import { globalWaybackProvider } from '@/providers/wayback-provider';
import { globalEvidenceAggregator } from '@/services/evidence-aggregator';
import { globalVerdictEngine } from '@/services/verdict-engine';
import { globalImageAnalyzer } from '@/services/image-analyzer';
import { globalVideoAnalyzer, SampledVideoFrameInput } from '@/services/video-analyzer';
import { globalAIReasoner } from '@/services/ai-reasoner';
import { verificationCache } from '@/lib/cache';
import { cleanText } from '@/lib/text-utils';
import * as cheerio from 'cheerio';
import { EvidenceItem, VerificationResult } from '@/types';

export const maxDuration = 60;

interface VerifyPayload {
  inputContent?: string;
  inputType?: 'text' | 'url' | 'image' | 'video';
  imageBase64?: string;
  imageMime?: string;
  videoMeta?: {
    duration?: number;
    frames?: SampledVideoFrameInput[];
  };
  stream?: boolean;
}

class PipelineValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function extractArticleTextFromHtml(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, nav, footer, header').remove();
  const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
  const desc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
  const articleBody =
    $('article').text() ||
    $('main').text() ||
    $('p')
      .slice(0, 8)
      .map((_, el) => $(el).text())
      .get()
      .join(' ');
  return cleanText(`${title}. ${desc}. ${articleBody}`).slice(0, 2500);
}

async function runVerificationPipeline(
  payload: VerifyPayload,
  startTime: number,
  sendStage?: (stageIndex: number, message: string) => void
): Promise<VerificationResult> {
  const inputContent = (payload.inputContent || '').trim();
  const inputType = payload.inputType || 'text';
  const imageBase64 = payload.imageBase64;
  const imageMime = payload.imageMime || 'image/jpeg';
  const videoMeta = payload.videoMeta;

  // Stage 1: Reading content & URL safety
  sendStage?.(1, 'جاري قراءة المحتوى وتحديده...');
  let contentToAnalyze = inputContent;
  const mediaAnalysis: VerificationResult['mediaAnalysis'] = {};
  let urlUploadDate: string | undefined;
  let waybackArchive: { firstSeenDate: string; archiveUrl: string } | null = null;

  const looksLikeUrl =
    inputType === 'url' || inputContent.startsWith('http://') || inputContent.startsWith('https://');

  if (looksLikeUrl && inputContent) {
    const urlSafe = await validateSafeUrl(inputContent);
    if (!urlSafe.valid) {
      throw new PipelineValidationError(urlSafe.reason || 'رابط غير مسموح به.', 400);
    }

    const [fetchedPage, waybackRes] = await Promise.all([
      globalVideoAnalyzer.isVideoUrl(inputContent)
        ? globalVideoAnalyzer.extractVideoUrlMetadata(inputContent).then((meta) => ({ kind: 'video' as const, meta }))
        : safeFetchText(inputContent, { timeoutMs: 6000 }).then((res) => ({ kind: 'article' as const, res })),
      globalWaybackProvider.getEarliestSnapshot(inputContent),
    ]);

    if (waybackRes) {
      waybackArchive = {
        firstSeenDate: waybackRes.firstSeenDate,
        archiveUrl: waybackRes.archiveUrl,
      };
    }

    if (fetchedPage.kind === 'video' && fetchedPage.meta) {
      urlUploadDate = fetchedPage.meta.uploadDate;
      contentToAnalyze = cleanText(`${fetchedPage.meta.title}. ${fetchedPage.meta.description}`).slice(0, 1500);
    } else if (fetchedPage.kind === 'article' && fetchedPage.res.ok) {
      const extracted = extractArticleTextFromHtml(fetchedPage.res.text);
      if (extracted) {
        contentToAnalyze = extracted;
      }
    }
  }

  // Stage 2: Media Analysis (Video first so video uploads are never routed to ImageAnalyzer)
  if (inputType === 'video') {
    sendStage?.(2, 'تحليل الفيديو: استخراج اللقطات الزمنية وفحص النصوص الظاهرة...');
    const videoResult = await globalVideoAnalyzer.analyzeTimeline(
      videoMeta?.duration || 20,
      videoMeta?.frames
    );
    mediaAnalysis.video = videoResult;
    if (videoResult.transcript) {
      contentToAnalyze = `${contentToAnalyze} ${videoResult.transcript}`.trim();
    }
  } else if (imageBase64) {
    sendStage?.(2, 'فحص الصورة: استخراج النص (OCR) وفحص البيانات الوصفية...');
    const base64Clean = imageBase64.replace(/^data:image\/[\w+.-]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    const imgResult = await globalImageAnalyzer.analyze(buffer, imageMime);
    mediaAnalysis.image = imgResult;
    if (imgResult.ocrText) {
      contentToAnalyze = `${contentToAnalyze} ${imgResult.ocrText}`.trim();
    }
  }

  // Stage 3: Claim Extraction
  sendStage?.(3, 'استخراج وتصنيف الادعاءات القابلة للتحقق...');
  const claims = globalClaimExtractor.extractClaims(contentToAnalyze);

  // Stage 4: Multi-Provider Search across up to 2 primary extracted claims
  sendStage?.(4, 'البحث المتزامن في مصادر الأخبار وقواعد البيانات الدولية...');
  const claimsToQuery = claims.length > 0 ? claims.slice(0, 2) : [];
  const rawEvidence: EvidenceItem[] = [];

  if (claimsToQuery.length > 0) {
    const searchPromises = claimsToQuery.map((c) => {
      const isSci = c.category === 'طبي' || c.category === 'علمي';
      return globalProviderRegistry.searchAll(c.text, c.language || 'ar', isSci);
    });
    const claimResults = await Promise.all(searchPromises);
    for (const items of claimResults) {
      rawEvidence.push(...items);
    }
  } else if (contentToAnalyze) {
    const fallbackItems = await globalProviderRegistry.searchAll(contentToAnalyze.slice(0, 120), 'ar', false);
    rawEvidence.push(...fallbackItems);
  }

  // Stage 5: Comparison, Relevance Filtering, Stance & Contradiction Resolution
  sendStage?.(5, 'مقارنة النتائج، تدقيق الموثوقية وكشف التناقضات...');
  const { rankedEvidence, contradictions, earliestContext: computedEarliest } =
    globalEvidenceAggregator.processEvidence(rawEvidence, claims);

  // Enrich earliest context with Wayback / video upload date if URL itself is significantly older
  let earliestContext = computedEarliest;
  const archiveDateStr = urlUploadDate?.slice(0, 10) || waybackArchive?.firstSeenDate;
  if (archiveDateStr) {
    const archiveYear = new Date(archiveDateStr).getFullYear();
    const currentYear = new Date().getFullYear();
    if (!isNaN(archiveYear) && archiveYear < currentYear - 1) {
      const claimMentionsYear = claims.some((c) => c.text.includes(String(archiveYear)));
      if (!claimMentionsYear && (!earliestContext || new Date(archiveDateStr) < new Date(earliestContext.firstSeenDate || '9999'))) {
        earliestContext = {
          firstSeenDate: archiveDateStr,
          firstSeenUrl: waybackArchive?.archiveUrl || inputContent,
          originalContext: 'أول أرشفة مسجلة للرابط الأصلي (Wayback / Metadata)',
          isRecycled: earliestContext?.isRecycled ?? false,
        };
      }
    }
  }

  // Optional Stage 5b: Semantic refinement via LLM (strictly bounded to retrieved evidence)
  let finalEvidence = rankedEvidence;
  let aiSummaryOverride: string | undefined;
  if (globalAIReasoner.isConfigured() && finalEvidence.length > 0) {
    const refined = await globalAIReasoner.refineEvidenceStances(claims, finalEvidence);
    finalEvidence = refined.evidence;
    aiSummaryOverride = refined.summaryOverride;
  }

  // Stage 6: Verdict Evaluation
  sendStage?.(6, 'تقييم الأدلة وحساب درجة الثقة وإصدار الحكم...');
  const verdictOutput = globalVerdictEngine.evaluate(
    claims,
    finalEvidence,
    contradictions,
    mediaAnalysis,
    earliestContext
  );

  return {
    id: `fc-${Date.now()}`,
    inputType,
    inputContent: inputContent || claims[0]?.text || 'تحليل وسائط',
    verdict: verdictOutput.verdict,
    verdictLabelAr: verdictOutput.verdictLabelAr,
    verdictLabelEn: verdictOutput.verdictLabelEn,
    confidence: verdictOutput.confidence,
    confidenceDisclaimer: verdictOutput.confidenceDisclaimer,
    summary: aiSummaryOverride || verdictOutput.summary,
    claims,
    evidence: finalEvidence,
    contradictions,
    mediaAnalysis: Object.keys(mediaAnalysis).length > 0 ? mediaAnalysis : undefined,
    earliestContext,
    sourcesCount: finalEvidence.length,
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
}

function buildVerifyCacheKey(payload: VerifyPayload): string {
  const inputType = payload.inputType || 'text';
  const textPart = cleanText(payload.inputContent || '').slice(0, 120);
  const mediaHashSource =
    payload.imageBase64 || (payload.videoMeta ? JSON.stringify(payload.videoMeta) : '');
  const mediaHash = mediaHashSource
    ? createHash('sha256').update(mediaHashSource).digest('hex').slice(0, 16)
    : 'none';
  return `verify:v2:${inputType}:${textPart}:${mediaHash}:ai${globalAIReasoner.isConfigured() ? 1 : 0}`;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const rawForwarded = req.headers.get('x-forwarded-for');
  const clientIp =
    (rawForwarded ? rawForwarded.split(',')[0].trim() : '') ||
    req.headers.get('x-real-ip') ||
    'local-client';

  // 1. Rate Limiting Check
  const rateLimit = globalRateLimiter.isAllowed(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'تجاوزت الحد المسموح من الطلبات، يرجى المحاولة بعد قليل.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetTimeMs / 1000)) } }
    );
  }

  let body: VerifyPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'صيغة طلب غير صالحة (JSON Required).' }, { status: 400 });
  }

  const hasVideoFrames = Boolean(body.videoMeta?.frames && body.videoMeta.frames.length > 0);
  if (!body.inputContent?.trim() && !body.imageBase64 && !hasVideoFrames) {
    return NextResponse.json({ error: 'يرجى تقديم نص أو رابط أو وسائط للتحقق منها.' }, { status: 400 });
  }

  const cacheKey = buildVerifyCacheKey(body);
  const cachedResult = verificationCache.get(cacheKey) as VerificationResult | null;

  // Support SSE Streaming
  if (body.stream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendStage = (stageIndex: number, message: string) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'progress', stageIndex, message })}\n\n`)
          );
        };

        try {
          if (cachedResult) {
            sendStage(6, 'تم استرجاع نتيجة موثقة مطابقة من الذاكرة المؤقتة...');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'result', data: cachedResult })}\n\n`));
            controller.close();
            return;
          }

          const finalResult = await runVerificationPipeline(body, startTime, sendStage);
          verificationCache.set(cacheKey, finalResult);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'result', data: finalResult })}\n\n`));
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: err.message || 'Verification failed' })}\n\n`)
          );
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

  // Non-streaming execution
  try {
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    const finalResult = await runVerificationPipeline(body, startTime);
    verificationCache.set(cacheKey, finalResult);
    return NextResponse.json(finalResult);
  } catch (err: any) {
    const status = err instanceof PipelineValidationError ? err.status : 500;
    return NextResponse.json({ error: `فشل التحقق: ${err.message}` }, { status });
  }
}
