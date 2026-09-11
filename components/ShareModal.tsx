'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2, Newspaper } from 'lucide-react';
import { VerificationResult } from '@/types';
import { Language, translations } from '@/lib/i18n';
import { formatDisplayDate, toWesternDigits } from '@/lib/text-utils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: VerificationResult;
  lang: Language;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, result, lang }) => {
  const t = translations[lang];
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const verdictText = lang === 'ar' ? result.verdictLabelAr : result.verdictLabelEn;
    const shareText = `🔍 [${t.appName}]
${lang === 'ar' ? 'الادعاء:' : 'Claim:'} "${result.inputContent}"
${lang === 'ar' ? 'الحكم التحريري:' : 'Verdict:'} ${verdictText} (${result.verdict})
${t.confidenceLabel} ${toWesternDigits(result.confidence)}%
${lang === 'ar' ? 'التقييم:' : 'Assessment:'} ${result.summary}
${lang === 'ar' ? 'المصادر:' : 'Sources:'} ${toWesternDigits(result.sourcesCount)} ${t.sourcesCountLabel}

${t.masthead}`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#151619] border border-slate-300 dark:border-zinc-800 rounded-lg w-full max-w-md p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 [dir=rtl]:left-auto [dir=rtl]:right-auto [dir=rtl]:top-4 [dir=ltr]:right-4 p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200 dark:border-zinc-800">
          <Share2 className="h-4 w-4 text-slate-800 dark:text-zinc-200" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-sans">
            {lang === 'ar' ? 'مشاركة بطاقة التحقق التحريرية' : 'Share Verification Dossier'}
          </h3>
        </div>

        {/* Editorial Share Card */}
        <div className="p-4 rounded border border-slate-300 dark:border-zinc-800 bg-slate-50 dark:bg-[#111215] mb-4 text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 font-serif font-bold text-slate-900 dark:text-zinc-100">
              <Newspaper className="h-3.5 w-3.5" />
              <span>FACTCHECK DESK</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {formatDisplayDate(result.verifiedAt, lang)}
            </span>
          </div>

          <div className="mb-2">
            <span className="text-[10px] text-slate-500 block mb-0.5">{lang === 'ar' ? 'الادعاء:' : 'Claim:'}</span>
            <p className="font-serif font-bold text-slate-900 dark:text-zinc-100 line-clamp-2">"{result.inputContent}"</p>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-[#16181d] border border-slate-200 dark:border-zinc-800 mb-2">
            <div>
              <span className="text-[10px] text-slate-500 block">{t.verdictTitle}:</span>
              <strong className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                {lang === 'ar' ? result.verdictLabelAr : result.verdictLabelEn}
              </strong>
            </div>
            <div className="text-left [dir=rtl]:text-right">
              <span className="text-[10px] text-slate-500 block">{lang === 'ar' ? 'الموثوقية:' : 'Confidence:'}</span>
              <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">{toWesternDigits(result.confidence)}%</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-700 dark:text-zinc-300 leading-snug line-clamp-3 mb-2 font-serif">
            {result.summary}
          </p>

          <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-200 dark:border-zinc-800 flex justify-between">
            <span>{toWesternDigits(result.sourcesCount)} {t.sourcesCountLabel}</span>
            <span className="font-mono">FactCheck AI</span>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-2 rounded font-bold text-xs bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-950 hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? t.copiedBtn : (lang === 'ar' ? 'نسخ نص البطاقة' : 'Copy Card Text')}</span>
        </button>
      </div>
    </div>
  );
};
