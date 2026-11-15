'use client';

import React from 'react';
import { Image as ImageIcon, Video as VideoIcon, Camera, AlertCircle, FileText, Clock } from 'lucide-react';
import { ImageAnalysisResult, VideoAnalysisResult } from '@/types';
import { Language, translations } from '@/lib/i18n';
import { toWesternDigits } from '@/lib/text-utils';

interface MediaAnalysisViewProps {
  imageAnalysis?: ImageAnalysisResult;
  videoAnalysis?: VideoAnalysisResult;
  lang: Language;
}

export const MediaAnalysisView: React.FC<MediaAnalysisViewProps> = ({ imageAnalysis, videoAnalysis, lang }) => {
  const t = translations[lang];
  if (!imageAnalysis && !videoAnalysis) return null;

  return (
    <div className="w-full max-w-4xl mx-auto my-5 space-y-4">
      {/* Image Forensics Section */}
      {imageAnalysis && (
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-zinc-800 rounded-lg p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-slate-700 dark:text-zinc-300" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 font-sans">
                {t.forensicsTitle}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">OCR & EXIF Inspection</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* OCR Extracted Text */}
            <div className="p-3.5 rounded bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-600" />
                <span>{t.ocrTitle}</span>
                {imageAnalysis.ocrConfidence > 0 && (
                  <span className="font-mono text-slate-500 font-normal">({toWesternDigits(imageAnalysis.ocrConfidence)}%)</span>
                )}
              </div>
              <div className="text-xs text-slate-800 dark:text-zinc-200 bg-white dark:bg-[#111215] p-2.5 rounded border border-slate-200 dark:border-zinc-800 font-serif min-h-[50px]">
                {imageAnalysis.ocrText ? `"${imageAnalysis.ocrText}"` : <span className="text-slate-400 italic">{t.ocrEmpty}</span>}
              </div>
            </div>

            {/* EXIF Metadata */}
            <div className="p-3.5 rounded bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1.5">
                <Camera className="h-3.5 w-3.5 text-slate-600" />
                <span>{t.exifTitle}</span>
              </div>
              {imageAnalysis.hasExif ? (
                <div className="space-y-1 text-xs text-slate-700 dark:text-zinc-300">
                  {imageAnalysis.exif.Make && (
                    <div>
                      <span className="text-slate-500">{t.exifCamera}</span> {imageAnalysis.exif.Make} {imageAnalysis.exif.Model}
                    </div>
                  )}
                  {imageAnalysis.exif.DateTimeOriginal && (
                    <div>
                      <span className="text-slate-500">{t.exifDate}</span>{' '}
                      <span className="font-mono">{toWesternDigits(imageAnalysis.exif.DateTimeOriginal)}</span>
                    </div>
                  )}
                  {imageAnalysis.exif.Software && (
                    <div>
                      <span className="text-slate-500">{t.exifSoftware}</span> {imageAnalysis.exif.Software}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">{t.exifEmpty}</p>
              )}
            </div>
          </div>

          {/* Pixel ELA & Manipulation Likelihood */}
          <div className="mt-3 p-3 rounded bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
              <span className="font-bold text-slate-800 dark:text-zinc-200">{t.manipulationTitle}</span>
              <div className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
                <span className="text-slate-600 dark:text-zinc-400">
                  ELA: <strong className="text-slate-900 dark:text-zinc-100">{toWesternDigits(imageAnalysis.elaScore)}%</strong>
                </span>
                <span className="text-slate-600 dark:text-zinc-400">
                  AI: <strong className="text-slate-900 dark:text-zinc-100">{toWesternDigits(imageAnalysis.aiProbabilityScore)}%</strong>
                </span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded overflow-hidden mb-1.5">
              <div
                className={`h-full ${
                  Math.max(imageAnalysis.aiProbabilityScore, imageAnalysis.elaScore) > 60
                    ? 'bg-amber-500'
                    : Math.max(imageAnalysis.aiProbabilityScore, imageAnalysis.elaScore) > 30
                    ? 'bg-blue-600'
                    : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.max(imageAnalysis.aiProbabilityScore, imageAnalysis.elaScore)}%` }}
              />
            </div>

            {imageAnalysis.pixelEla?.analyzed && (
              <div className="my-2.5 p-2.5 rounded bg-white dark:bg-[#111215] border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {imageAnalysis.pixelEla.heatmapDataUrl && (
                  <img
                    src={imageAnalysis.pixelEla.heatmapDataUrl}
                    alt={lang === 'ar' ? 'خريطة تباين إعادة الضغط على مستوى البكسلات (ELA)' : 'Pixel ELA Heatmap'}
                    className="w-full sm:w-40 h-24 object-contain rounded border border-slate-200 dark:border-zinc-800 bg-slate-950 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0 space-y-1 text-[11px] text-slate-600 dark:text-zinc-300">
                  <div className="font-bold text-slate-800 dark:text-zinc-200">
                    {lang === 'ar' ? 'نتائج فحص البكسلات وإعادة الضغط (8×8 JPEG ELA)' : 'Pixel Recompression Analysis (8x8 JPEG ELA)'}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono tabular-nums text-[11px] text-slate-600 dark:text-zinc-400">
                    <span>
                      {lang === 'ar' ? 'متوسط الخطأ:' : 'Mean:'}{' '}
                      <strong className="text-slate-900 dark:text-zinc-100">{toWesternDigits(imageAnalysis.pixelEla.meanError)}</strong>
                    </span>
                    <span>
                      {lang === 'ar' ? 'أقصى فرق كُتلي:' : 'Max Block:'}{' '}
                      <strong className="text-slate-900 dark:text-zinc-100">{toWesternDigits(imageAnalysis.pixelEla.maxBlockError)}</strong>
                    </span>
                    <span>
                      {lang === 'ar' ? 'نسبة البؤر الشاذة:' : 'Hotspots:'}{' '}
                      <strong className="text-slate-900 dark:text-zinc-100">
                        {toWesternDigits((imageAnalysis.pixelEla.hotspotRatio * 100).toFixed(2))}%
                      </strong>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                    {lang === 'ar'
                      ? 'المناطق الساطعة (البرتقالية/الحمراء) تشير إلى تباين أعلى في إعادة الضغط مقارنة ببقية أجزاء الصورة.'
                      : 'Brighter orange/red regions indicate higher recompression variance relative to surrounding blocks.'}
                  </p>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
              {imageAnalysis.aiProbabilityDisclaimer}
            </p>
            {imageAnalysis.manipulationIndicators.length > 0 && (
              <ul className="mt-2 pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-1 text-[11px] text-slate-600 dark:text-zinc-300 list-disc list-inside">
                {imageAnalysis.manipulationIndicators.map((ind, i) => (
                  <li key={i}>{ind}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Video Forensics */}
      {videoAnalysis && (
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-zinc-800 rounded-lg p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <VideoIcon className="h-4 w-4 text-slate-700 dark:text-zinc-300" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 font-sans">
                {t.videoTimelineTitle}
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
              {t.videoDuration} {toWesternDigits(videoAnalysis.duration)}s
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {videoAnalysis.timeline.map((frame, idx) => (
              <div key={idx} className="p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs">
                {frame.thumbnailUrl && (
                  <img
                    src={frame.thumbnailUrl}
                    alt={`Frame ${toWesternDigits(idx + 1)}`}
                    className="w-full h-24 object-cover rounded border border-slate-200 dark:border-zinc-800 mb-2"
                  />
                )}
                <div className="flex items-center justify-between mb-1 text-slate-600 dark:text-zinc-400 font-mono text-[11px]">
                  <span>{toWesternDigits(frame.timestamp)}</span>
                  <span>Frame #{toWesternDigits(idx + 1)}</span>
                </div>
                <p className="font-semibold text-slate-800 dark:text-zinc-200 truncate">{frame.sceneDescription}</p>
                {frame.ocrText && <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 font-serif">"{frame.ocrText}"</p>}
              </div>
            ))}
          </div>

          {videoAnalysis.transcript && (
            <div className="mt-3 p-2.5 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300">
              <strong className="block mb-0.5">{t.videoTranscript}</strong>
              <span className="font-serif">"{videoAnalysis.transcript}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
