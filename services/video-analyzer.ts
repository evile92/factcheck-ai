import { VideoAnalysisResult, VideoTimelineFrame } from '@/types';
import * as cheerio from 'cheerio';
import { cleanText } from '@/lib/text-utils';
import { safeFetchText } from '@/lib/ssrf';
import { globalImageAnalyzer } from './image-analyzer';

export interface SampledVideoFrameInput {
  seconds: number;
  text?: string;
  thumbnail?: string; // data URL (JPEG/PNG)
}

export class VideoAnalyzer {
  /**
   * Checks whether a URL looks like a social/video platform link.
   */
  isVideoUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return (
      lower.includes('youtube.com/') ||
      lower.includes('youtu.be/') ||
      lower.includes('vimeo.com/') ||
      lower.includes('tiktok.com/') ||
      lower.includes('x.com/') ||
      lower.includes('twitter.com/') ||
      lower.includes('facebook.com/watch') ||
      lower.includes('instagram.com/reel')
    );
  }

  /**
   * Fetches public OpenGraph / oEmbed metadata for social media video links (YouTube, X, Vimeo, etc.)
   */
  async extractVideoUrlMetadata(url: string): Promise<{
    title: string;
    description: string;
    uploadDate?: string;
    thumbnailUrl?: string;
  } | null> {
    try {
      const res = await safeFetchText(url, {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FactCheckBot/1.0',
        timeoutMs: 6000,
      });

      if (!res.ok) return null;

      const $ = cheerio.load(res.text);

      let title =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text() ||
        '';

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '';

      let thumbnailUrl =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content');

      const uploadDate =
        $('meta[itemprop="uploadDate"]').attr('content') ||
        $('meta[itemprop="datePublished"]').attr('content') ||
        $('meta[property="article:published_time"]').attr('content');

      // YouTube oEmbed fallback when page title is generic
      if ((!title || title.toLowerCase() === 'youtube') && (url.includes('youtube.com') || url.includes('youtu.be'))) {
        try {
          const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (oembedRes.ok) {
            const oembed = await oembedRes.json();
            if (oembed.title) title = oembed.title;
            if (!thumbnailUrl && oembed.thumbnail_url) thumbnailUrl = oembed.thumbnail_url;
          }
        } catch {}
      }

      if (!title && !description) return null;

      return {
        title: cleanText(title || 'فيديو بدون عنوان'),
        description: cleanText(description),
        uploadDate,
        thumbnailUrl,
      };
    } catch {
      return null;
    }
  }

  private formatTimestamp(sec: number): string {
    const rounded = Math.max(0, Math.round(sec));
    const minutes = Math.floor(rounded / 60);
    const remainingSec = rounded % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;
  }

  /**
   * Generates a structured analysis timeline for a video file using real sampled frames (with OCR)
   * or a fallback timestamp schedule if no client frames were supplied.
   */
  async analyzeTimeline(
    durationSeconds = 20,
    extractedFrames?: SampledVideoFrameInput[]
  ): Promise<VideoAnalysisResult> {
    const timeline: VideoTimelineFrame[] = [];

    if (extractedFrames && extractedFrames.length > 0) {
      // Run OCR concurrently on up to 4 real extracted frames
      const framesToProcess = extractedFrames.slice(0, 4);
      const processedFrames = await Promise.all(
        framesToProcess.map(async (frame, idx) => {
          let ocrText = frame.text ? cleanText(frame.text) : '';
          if (!ocrText && frame.thumbnail && frame.thumbnail.includes('base64,')) {
            try {
              const base64Body = frame.thumbnail.split('base64,')[1];
              const buf = Buffer.from(base64Body, 'base64');
              const ocrRes = await globalImageAnalyzer.extractTextOcr(buf);
              ocrText = ocrRes.text;
            } catch {}
          }

          return {
            timestamp: this.formatTimestamp(frame.seconds),
            seconds: Math.round(frame.seconds),
            thumbnailUrl: frame.thumbnail,
            ocrText,
            sceneDescription:
              idx === 0
                ? 'لقطة البداية المستخلصة من الفيديو'
                : idx === framesToProcess.length - 1
                ? 'لقطة ختامية من سياق المقطع'
                : `لقطة زمنية رقم ${idx + 1} للفحص البصري`,
          } satisfies VideoTimelineFrame;
        })
      );

      timeline.push(...processedFrames);
    } else {
      const safeDuration = Math.max(5, Math.round(durationSeconds));
      const interval = Math.max(5, Math.floor(safeDuration / 4));
      for (let sec = 0; sec <= safeDuration; sec += interval) {
        timeline.push({
          timestamp: this.formatTimestamp(sec),
          seconds: sec,
          ocrText: '',
          sceneDescription:
            sec === 0
              ? 'نقطة فحص البداية (لم يتم رفع لقطات إضافية)'
              : 'نقطة فحص زمنية',
        });
      }
    }

    const uniqueTexts = Array.from(new Set(timeline.map((f) => f.ocrText).filter(Boolean))) as string[];
    const transcript = uniqueTexts.join(' | ');

    return {
      duration: Math.round(durationSeconds),
      timeline,
      transcript,
      keyClaims: uniqueTexts.length > 0 ? uniqueTexts.slice(0, 3) : [],
    };
  }

  /**
   * Synchronous wrapper preserved for compatibility.
   */
  generateTimelineAnalysis(
    durationSeconds = 20,
    extractedFrames?: Array<{ seconds: number; text?: string; thumbnail?: string }>
  ): VideoAnalysisResult {
    const timeline: VideoTimelineFrame[] = [];
    const interval = Math.max(5, Math.floor(durationSeconds / 4));

    for (let sec = 0; sec <= durationSeconds; sec += interval) {
      const clientFrame = extractedFrames?.find((f) => Math.abs(f.seconds - sec) < 2);
      timeline.push({
        timestamp: this.formatTimestamp(sec),
        seconds: sec,
        thumbnailUrl: clientFrame?.thumbnail,
        ocrText: clientFrame?.text || '',
        sceneDescription:
          sec === 0
            ? 'مشهد البداية ومقدمة الفيديو'
            : sec === interval
            ? 'المشهد الرئيسي وحركة العناصر'
            : 'سياق الحدث وتفاصيل المحيط',
      });
    }

    const transcript = extractedFrames?.map((f) => f.text).filter(Boolean).join(' ') || '';

    return {
      duration: durationSeconds,
      timeline,
      transcript,
      keyClaims: transcript ? [cleanText(transcript)] : [],
    };
  }
}

export const globalVideoAnalyzer = new VideoAnalyzer();
