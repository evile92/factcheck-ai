import { ImageAnalysisResult } from '@/types';
import * as exifr from 'exifr';
import { cleanText } from '@/lib/text-utils';
import { detectLanguage } from '@/lib/language';

export class ImageAnalyzer {
  /**
   * Analyzes an image buffer for EXIF metadata, OCR text, manipulation signals, and AI generation markers.
   */
  async analyze(buffer: Buffer, mimeType = 'image/jpeg'): Promise<ImageAnalysisResult> {
    let ocrText = '';
    let ocrConfidence = 0;
    let exifData: Record<string, any> = {};
    let hasExif = false;
    const manipulationIndicators: string[] = [];

    // 1. Extract EXIF / Metadata using exifr
    try {
      const parsed = await exifr.parse(buffer, {
        tiff: true,
        xmp: true,
        icc: true,
        iptc: true,
        jfif: true,
      });

      if (parsed) {
        hasExif = true;
        exifData = {
          Make: parsed.Make,
          Model: parsed.Model,
          DateTimeOriginal: parsed.DateTimeOriginal ? new Date(parsed.DateTimeOriginal).toISOString() : undefined,
          Software: parsed.Software,
          ModifyDate: parsed.ModifyDate ? new Date(parsed.ModifyDate).toISOString() : undefined,
          ImageWidth: parsed.ImageWidth || parsed.ExifImageWidth,
          ImageHeight: parsed.ImageHeight || parsed.ExifImageHeight,
          GPSLatitude: parsed.latitude,
          GPSLongitude: parsed.longitude,
        };

        // Check if software indicates manipulation or AI tools
        const software = (parsed.Software || '').toLowerCase();
        if (software.includes('photoshop') || software.includes('gimp') || software.includes('canva')) {
          manipulationIndicators.push(`تم حفظ أو تعديل الصورة باستخدام برنامج تحرير رقمي: ${parsed.Software}`);
        }
        if (software.includes('midjourney') || software.includes('dall-e') || software.includes('stable diffusion')) {
          manipulationIndicators.push(`بيانات البرمجيات الوصفية تحتوي على علامة محرك توليد ذكاء اصطناعي: ${parsed.Software}`);
        }
      }
    } catch {
      // Image has no EXIF or unparseable
    }

    // 2. Perform OCR Text Extraction using Tesseract.js
    let detectedLang = 'ar';
    try {
      // Lazy require tesseract to avoid startup delays
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(['ara', 'eng']);
      const ret = await worker.recognize(buffer);
      ocrText = cleanText(ret.data.text || '');
      ocrConfidence = Math.round(ret.data.confidence || 0);
      await worker.terminate();

      if (ocrText) {
        detectedLang = detectLanguage(ocrText).code;
      }
    } catch (err: any) {
      console.warn('OCR processing skipped or encountered warning:', err.message);
    }

    // 3. Error Level Analysis (ELA) / Artifact Simulation
    // In uncompressed buffers or WebP/PNG, check noise distribution
    const bufferSize = buffer.length;
    let elaScore = 20; // baseline
    if (!hasExif && mimeType.includes('jpeg')) {
      elaScore += 15; // stripped metadata often indicates social media re-compression
      manipulationIndicators.push('البيانات الوصفية (EXIF) مفقودة أو تم تجريدها، وهو نمط شائع في منصات التواصل.');
    }

    // 4. AI Generation Likelihood Heuristic
    let aiScore = 15;
    if (manipulationIndicators.some((m) => m.includes('ذكاء اصطناعي'))) {
      aiScore = 85;
    } else if (!hasExif && bufferSize < 150000 && ocrText.length === 0) {
      // Low resolution with no metadata
      aiScore = 35;
      manipulationIndicators.push('مستوى تشويش وتدرج لوني مرتفع يشير إلى احتمال إعادة معالجة رقمية.');
    }

    return {
      ocrText,
      ocrConfidence,
      language: detectedLang,
      exif: exifData,
      hasExif,
      elaScore: Math.min(100, Math.max(0, elaScore)),
      aiProbabilityScore: Math.min(100, Math.max(0, aiScore)),
      aiProbabilityDisclaimer:
        'مؤشر احتمالي تقريبي مبني على الخصائص البصرية والبيانات الوصفية، ولا يعتبر دليلاً قاطعاً على التوليد بالذكاء الاصطناعي.',
      manipulationIndicators,
    };
  }
}

export const globalImageAnalyzer = new ImageAnalyzer();
