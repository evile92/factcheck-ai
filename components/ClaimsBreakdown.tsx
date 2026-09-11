'use client';

import React from 'react';
import { Tag, CheckCheck, FileQuestion } from 'lucide-react';
import { ExtractedClaim } from '@/types';
import { Language, translations } from '@/lib/i18n';
import { toWesternDigits } from '@/lib/text-utils';

interface ClaimsBreakdownProps {
  claims: ExtractedClaim[];
  lang: Language;
}

export const ClaimsBreakdown: React.FC<ClaimsBreakdownProps> = ({ claims, lang }) => {
  const t = translations[lang];
  if (claims.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto my-5 bg-white dark:bg-[#151619] border border-slate-200 dark:border-zinc-800 rounded-lg p-4 sm:p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-zinc-800">
        <Tag className="h-4 w-4 text-slate-700 dark:text-zinc-300" />
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 font-sans">
          {t.claimsSectionTitle}
        </h3>
      </div>

      <div className="space-y-2.5">
        {claims.map((claim, idx) => (
          <div
            key={claim.id || idx}
            className="p-3.5 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-zinc-400">
                  {t.claimNum} #{toWesternDigits(idx + 1)}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700">
                  {claim.category}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                  {t.claimLang}: {claim.language.toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-serif leading-snug">
                "{claim.text}"
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300 shrink-0 bg-white dark:bg-zinc-800 px-2.5 py-1 rounded border border-slate-200 dark:border-zinc-700">
              {claim.evidenceIds.length > 0 ? (
                <>
                  <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold">
                    {toWesternDigits(claim.evidenceIds.length)} {t.linkedEvidence}
                  </span>
                </>
              ) : (
                <>
                  <FileQuestion className="h-3.5 w-3.5 text-slate-400" />
                  <span>{t.pendingCheck}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
