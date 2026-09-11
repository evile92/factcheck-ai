'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ContradictionItem } from '@/types';
import { Language, translations } from '@/lib/i18n';
import { toWesternDigits } from '@/lib/text-utils';

interface ContradictionAlertProps {
  contradictions: ContradictionItem[];
  lang: Language;
}

export const ContradictionAlert: React.FC<ContradictionAlertProps> = ({ contradictions, lang }) => {
  const t = translations[lang];
  if (!contradictions || contradictions.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto my-5 p-4 sm:p-5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/60 shadow-xs">
      <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-amber-200 dark:border-amber-800/40">
        <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
        <h3 className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200">
          {t.contradictionTitle}
        </h3>
      </div>

      <div className="space-y-3">
        {contradictions.map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-[#151619] p-3.5 rounded border border-amber-200 dark:border-amber-800/40">
            <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2">
              {lang === 'ar' ? 'الادعاء المثار:' : 'Underlying Claim:'} "{item.claim}"
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
              <div className="p-2.5 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">{item.sourceA.stance}</span>
                <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">{item.sourceA.name}</p>
                <div className="text-[10px] text-slate-500 mt-1">Tier {toWesternDigits(item.sourceA.tier)} {item.sourceA.date ? `• ${toWesternDigits(item.sourceA.date)}` : ''}</div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block mb-0.5">{item.sourceB.stance}</span>
                <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">{item.sourceB.name}</p>
                <div className="text-[10px] text-slate-500 mt-1">Tier {toWesternDigits(item.sourceB.tier)} {item.sourceB.date ? `• ${toWesternDigits(item.sourceB.date)}` : ''}</div>
              </div>
            </div>

            <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">
              💡 {item.explanation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
