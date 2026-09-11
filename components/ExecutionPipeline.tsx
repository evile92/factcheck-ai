'use client';

import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Language, translations } from '@/lib/i18n';
import { toWesternDigits } from '@/lib/text-utils';

interface ExecutionPipelineProps {
  currentStageIndex: number;
  statusMessage?: string;
  lang: Language;
}

export const ExecutionPipeline: React.FC<ExecutionPipelineProps> = ({
  currentStageIndex,
  statusMessage,
  lang,
}) => {
  const t = translations[lang];

  return (
    <div className="w-full max-w-4xl mx-auto my-6 bg-white dark:bg-[#151619] border border-slate-200 dark:border-zinc-800 rounded-lg p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">{t.pipelineTitle}</h3>
        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
          {t.stageBadge} {toWesternDigits(Math.min(7, currentStageIndex))} / 7
        </span>
      </div>

      {statusMessage && (
        <div className="text-xs text-slate-700 dark:text-zinc-300 mb-4 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded p-2.5 flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600 dark:text-zinc-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Checklist grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
        {t.stages.map((stage, idx) => {
          const stageNum = idx + 1;
          const isDone = stageNum < currentStageIndex;
          const isCurrent = stageNum === currentStageIndex;

          return (
            <div
              key={stage.name}
              className={`p-2.5 rounded border transition-colors flex items-start gap-2 ${
                isCurrent
                  ? 'bg-slate-100 dark:bg-zinc-800/80 border-slate-400 dark:border-zinc-600 text-slate-900 dark:text-zinc-100 font-medium'
                  : isDone
                  ? 'bg-white dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
                  : 'bg-transparent border-slate-100 dark:border-zinc-900 text-slate-400 dark:text-zinc-600 opacity-60'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <div className="h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 text-slate-900 dark:text-zinc-100 animate-spin" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-slate-300 dark:border-zinc-700 flex items-center justify-center text-[9px] font-mono text-slate-400">
                    {toWesternDigits(stageNum)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold truncate">{stage.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">{stage.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
