import { VideoAnalysisResult, VideoTimelineFrame } from '@/types';
import * as cheerio from 'cheerio';
import { cleanText } from '@/lib/text-utils';
import { validateSafeUrl } from '@/lib/ssrf';

export class VideoAnalyzer {
  /**
   * Fetches public OpenGraph / oEmbed metadata for social media video links (YouTube, X, Vimeo, etc.)
   */
  async extractVideoUrlMetadata(url: string): Promise<{
    title: string;
    description: string;
    uploadDate?: string;
    thumbnailUrl?: string;
  } | null> {
    const safe = await validateSafeUrl(url);
    if (!safe.valid) return null;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FactCheckBot/1.0',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return null;

      const html = await res.text();
      const $ = cheerio.load(html);

      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text() ||
        'فيديو بدون عنوان';

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '';

      const thumbnailUrl =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content');

      const uploadDate =
        $('meta[itemprop="uploadDate"]').attr('content') ||
        $('meta[property="article:published_time"]').attr('content');

      return {
        title: cleanText(title),
        description: cleanText(description),
        uploadDate,
        thumbnailUrl,
      };
    } catch {
      return null;
    }
  }

  /**
   * Generates a structured analysis timeline for a video file.
   * Can accept client-sampled frames or generate timestamp checkpoints (00:00, 00:05, 00:10...).
   */
  generateTimelineAnalysis(
    durationSeconds = 20,
    extractedFrames?: Array<{ seconds: number; text?: string; thumbnail?: string }>
  ): VideoAnalysisResult {
    const timeline: VideoTimelineFrame[] = [];
    const interval = Math.max(5, Math.floor(durationSeconds / 4));

    for (let sec = 0; sec <= durationSeconds; sec += interval) {
      const minutes = Math.floor(sec / 60);
      const remainingSec = sec % 60;
      const timestamp = `${minutes.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;

      const clientFrame = extractedFrames?.find((f) => Math.abs(f.seconds - sec) < 2);

      timeline.push({
        timestamp,
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
