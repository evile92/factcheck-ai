'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Share2,
  Copy,
  Check,
  Calendar,
  Layers,
  Clock,
} from 'lucide-react';
import { VerificationResult, VerdictType } from '@/types';
import { Language, translations } from '@/lib/i18n';
import { formatDisplayDate, toWesternDigits } from '@/lib/text-utils';

interface VerdictCardProps {
  result: VerificationResult;
  onOpenShare: () => void;
  lang: Language;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({ result, onOpenShare, lang }) => {
  const t = translations[lang];
  const [copied, setCopied] = useState(false);

  const getVerdictStyle = (verdict: VerdictType) => {
    switch (verdict) {
      case 'TRUE':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-700 dark:text-emerald-400',
          bg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
          border: 'border-emerald-600 dark:border-emerald-600',
          stampClass: 'stamp-true',
          badge: 'bg-emerald-700 text-white dark:bg-emerald-600',
          title: lang === 'ar' ? 'صحيح ومؤكد' : 'VERIFIED TRUE',
        };
      case 'FALSE':
        return {
          icon: XCircle,
          color: 'text-rose-700 dark:text-rose-400',
          bg: 'bg-rose-50/60 dark:bg-rose-950/20',
          border: 'border-rose-600 dark:border-rose-600',
          stampClass: 'stamp-false',
          badge: 'bg-rose-700 text-white dark:bg-rose-600',
          title: lang === 'ar' ? 'كاذب / غير صحيح' : 'FALSE / UNFOUNDED',
        };
      case 'MISLEADING':
        return {
          icon: AlertTriangle,
          color: 'text-amber-700 dark:text-amber-400',
          bg: 'bg-amber-50/60 dark:bg-amber-950/20',
          border: 'border-amber-600 dark:border-amber-600',
          stampClass: 'stamp-misleading',
          badge: 'bg-amber-700 text-white dark:bg-amber-600',
          title: lang === 'ar' ? 'مضلل / خارج السياق' : 'MISLEADING CONTEXT',
        };
      case 'PARTLY_TRUE':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-700 dark:text-yellow-400',
          bg: 'bg-yellow-50/60 dark:bg-yellow-950/20',
          border: 'border-yellow-600 dark:border-yellow-600',
          stampClass: 'stamp-partly',
          badge: 'bg-yellow-700 text-white dark:bg-yellow-600',
          title: lang === 'ar' ? 'صحيح جزئياً' : 'PARTLY TRUE',
        };
      case 'UNVERIFIED':
      default:
        return {
          icon: HelpCircle,
          color: 'text-slate-700 dark:text-zinc-300',
          bg: 'bg-slate-50 dark:bg-zinc-900/40',
          border: 'border-slate-500 dark:border-zinc-600',
          stampClass: 'stamp-unverified',
          badge: 'bg-slate-700 text-white dark:bg-zinc-700',
          title: lang === 'ar' ? 'غير مؤكد — قيد المتابعة' : 'UNVERIFIED',
        };
    }
  };

  const style = getVerdictStyle(result.verdict);
  const VerdictIcon = style.icon;

  const handleCopyReport = async () => {
    const textReport = `${t.appName} — ${t.verdictTitle}
----------------------------------------
${lang === 'ar' ? 'الادعاء:' : 'Claim:'} ${result.inputContent}
${lang === 'ar' ? 'الحكم:' : 'Verdict:'} ${lang === 'ar' ? result.verdictLabelAr || style.title : result.verdictLabelEn || style.title}
${lang === 'ar' ? 'درجة الموثوقية:' : 'Confidence:'} ${toWesternDigits(result.confidence)}%
${lang === 'ar' ? 'التفسير التحريري:' : 'Editorial Assessment:'} ${result.summary}
${lang === 'ar' ? 'المصادر المفحوصة:' : 'Examined Sources:'} ${toWesternDigits(result.sourcesCount)} ${lang === 'ar' ? 'مصدر مستقل' : 'sources'}
${lang === 'ar' ? 'تاريخ الفحص:' : 'Date:'} ${formatDisplayDate(result.verifiedAt, lang)}
${lang === 'ar' ? 'أهم مصدر:' : 'Primary Source:'} ${result.evidence[0]?.sourceUrl || 'FactCheck Desk'}
----------------------------------------`;

    try {
      await navigator.clipboard.writeText(textReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <div
      className={`w-full max-w-4xl mx-auto rounded-lg p-4 sm:p-6 border border-slate-300 dark:border-zinc-800 bg-white dark:bg-[#151619] shadow-xs ${style.stampClass} transition-all overflow-hidden`}
    >
      {/* Editorial Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
            <VerdictIcon className={`h-6 w-6 ${style.color}`} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
              {t.verdictTitle}
            </span>
            <div className="flex items-center gap-2.5">
              <h2 className={`text-xl sm:text-2xl font-black ${style.color}`}>
                {lang === 'ar' ? result.verdictLabelAr || style.title : result.verdictLabelEn || style.title}
              </h2>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold uppercase ${style.badge}`}>
                {result.verdict}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400" />
            <span>{t.shareBtn}</span>
          </button>

          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400" />}
            <span>{copied ? t.copiedBtn : t.copyReportBtn}</span>
          </button>
        </div>
      </div>

      {/* Editorial Explanation */}
      <div className="my-5">
        <p className="text-base sm:text-lg text-slate-800 dark:text-zinc-100 font-medium leading-relaxed">
          {result.summary}
        </p>
      </div>

      {/* Recycled Alert */}
      {result.earliestContext?.isRecycled && (
        <div className="mb-5 p-3.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 flex items-start gap-3">
          <Calendar className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <strong className="font-bold block mb-0.5">{t.recycledAlertTitle}</strong>
            {lang === 'ar'
              ? `عُثر على هذا المحتوى منشوراً لأول مرة بتاريخ ${toWesternDigits(result.earliestContext.firstSeenDate || '')} تحت عنوان: "${result.earliestContext.originalContext}".`
              : `This content was first documented on ${result.earliestContext.firstSeenDate || ''} under title: "${result.earliestContext.originalContext}".`}
          </div>
        </div>
      )}

      {/* Confidence & Statistics Row */}
      <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700 dark:text-zinc-300">{t.confidenceLabel}</span>
          <div className="flex items-center gap-2">
            <div className="w-24 sm:w-32 h-2 bg-slate-200 dark:bg-zinc-800 rounded overflow-hidden">
              <div
                className={`h-full transition-all ${
                  result.confidence > 75
                    ? 'bg-emerald-600'
                    : result.confidence > 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${result.confidence}%` }}
              />
            </div>
            <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">{toWesternDigits(result.confidence)}%</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            <span>
              {toWesternDigits(result.sourcesCount)} {t.sourcesCountLabel}
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>{toWesternDigits((result.executionTimeMs / 1000).toFixed(2))}s</span>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-slate-400 dark:text-zinc-500">* {t.confidenceNote}</p>
    </div>
  );
};
