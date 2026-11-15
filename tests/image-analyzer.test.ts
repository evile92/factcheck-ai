import { describe, it, expect, vi, afterEach } from 'vitest';
import { encode as encodeJpeg, decode as decodeJpeg } from 'jpeg-js';
import { ImageAnalyzer } from '../services/image-analyzer';

describe('ImageAnalyzer & Pixel-level Error Level Analysis (ELA)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('analyzes a clean uniform JPEG with low ELA score and generates a heatmap preview', async () => {
    const analyzer = new ImageAnalyzer();
    vi.spyOn(analyzer, 'extractTextOcr').mockResolvedValue({ text: '', confidence: 0 });

    const width = 128;
    const height = 128;
    const rgba = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        rgba[idx] = Math.round((x / width) * 180 + 30);
        rgba[idx + 1] = Math.round((y / height) * 180 + 30);
        rgba[idx + 2] = 120;
        rgba[idx + 3] = 255;
      }
    }

    const cleanJpeg = Buffer.from(encodeJpeg({ width, height, data: rgba }, 90).data);
    const result = await analyzer.analyze(cleanJpeg, 'image/jpeg');

    expect(result.pixelEla).toBeDefined();
    expect(result.pixelEla?.analyzed).toBe(true);
    expect(result.pixelEla?.method).toBe('jpeg_recompression');
    expect(result.pixelEla?.hotspotRatio).toBeLessThan(0.02);
    expect(result.pixelEla?.heatmapDataUrl?.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(result.elaScore).toBeLessThan(35);
  });

  it('detects elevated ELA block anomalies on a locally spliced JPEG patch', async () => {
    const analyzer = new ImageAnalyzer();
    vi.spyOn(analyzer, 'extractTextOcr').mockResolvedValue({ text: '', confidence: 0 });

    const width = 160;
    const height = 160;
    const baseRgba = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        baseRgba[idx] = 90;
        baseRgba[idx + 1] = 110;
        baseRgba[idx + 2] = 135;
        baseRgba[idx + 3] = 255;
      }
    }

    // First save background at low JPEG quality (Q=55)
    const lowQ = encodeJpeg({ width, height, data: baseRgba }, 55).data;
    const spliced = decodeJpeg(lowQ, { useTArray: true, formatAsRGBA: true }).data;

    // Splice a sharp high-contrast checkerboard patch in a localized 32x32 center area, then save at Q=98
    for (let y = 64; y < 96; y++) {
      for (let x = 64; x < 96; x++) {
        const idx = (y * width + x) * 4;
        const checker = ((x ^ y) & 1) === 0 ? 250 : 10;
        spliced[idx] = checker;
        spliced[idx + 1] = 255 - checker;
        spliced[idx + 2] = checker;
      }
    }

    const tamperedJpeg = Buffer.from(encodeJpeg({ width, height, data: spliced }, 98).data);
    const result = await analyzer.analyze(tamperedJpeg, 'image/jpeg');

    expect(result.pixelEla?.analyzed).toBe(true);
    expect(result.pixelEla?.maxBlockError).toBeGreaterThan(2.2);
    expect(result.pixelEla?.hotspotRatio).toBeGreaterThan(0.01);
    expect(result.elaScore).toBeGreaterThanOrEqual(45);
  });

  it('falls back cleanly to metadata inspection on non-JPEG images', async () => {
    const analyzer = new ImageAnalyzer();
    vi.spyOn(analyzer, 'extractTextOcr').mockResolvedValue({ text: '', confidence: 0 });

    const fakePngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const result = await analyzer.analyze(fakePngHeader, 'image/png');

    expect(result.pixelEla?.analyzed).toBe(false);
    expect(result.pixelEla?.method).toBe('metadata_only');
    expect(result.elaScore).toBeLessThanOrEqual(25);
  });
});
