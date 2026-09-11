'use client';

import React from 'react';
import { ExternalLink, CheckCircle2, XCircle, FileText, Building2, Globe2, BookOpen, ShieldAlert } from 'lucide-react';
import { EvidenceItem } from '@/types';
import { Language, translations } from '@/lib/i18n';
import { toWesternDigits } from '@/lib/text-utils';

interface EvidenceListProps {
  evidence: EvidenceItem[];
  lang: Language;
}

export const EvidenceList: React.FC<EvidenceListProps> = ({ evidence, lang }) => {
  const t = translations[lang];

  if (evidence.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto my-6 p-6 rounded-lg bg-white dark:bg-[#151619] border border-slate-200 dark:border-zinc-800 text-center">
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium">{t.noEvidenceFound}</p>
      </div>
    );
  }

  const getTierInfo = (tier: number) => {
    switch (tier) {
      case 1:
        return {
          label: lang === 'ar' ? 'المستوى 1: مصدر أولي / حكومي / علمي' : 'Tier 1: Government / Official / Academic',
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
          icon: Building2,
        };
      case 2:
        return {
          label: lang === 'ar' ? 'المستوى 2: وكالة أنباء عالمية / جهة تدقيق' : 'Tier 2: Global Wire / Fact-Check Org',
          badge: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
          icon: Globe2,
        };
      case 3:
        return {
          label: lang === 'ar' ? 'المستوى 3: صحيفة إخبارية رئيسية' : 'Tier 3: Mainstream News Outlet',
          badge: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
          icon: BookOpen,
        };
      case 4:
        return {
          label: lang === 'ar' ? 'المستوى 4: منصة / مدونة ثانوية' : 'Tier 4: Secondary Blog / Outlet',
          badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800',
          icon: BookOpen,
        };
      default:
        return {
          label: lang === 'ar' ? 'المستوى 5: مصدر غير مصنف أو ساخر' : 'Tier 5: Satire / Low Reliability',
          badge: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
          icon: ShieldAlert,
        };
    }
  };

  const getStanceInfo = (stance: string) => {
    switch (stance) {
      case 'supports':
        return {
          label: lang === 'ar' ? 'يؤكد الادعاء' : 'Corroborates Claim',
          badge: 'text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
          icon: CheckCircle2,
        };
      case 'refutes':
        return {
          label: lang === 'ar' ? 'ينفي الادعاء' : 'Refutes Claim',
          badge: 'text-rose-700 bg-rose-50 border-rose-300 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
          icon: XCircle,
        };
      default:
        return {
          label: lang === 'ar' ? 'تغطية / سياق إخباري' : 'Coverage / Context',
          badge: 'text-slate-700 bg-slate-100 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
          icon: FileText,
        };
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-zinc-800">
        <h3 className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          <span>{t.evidenceSectionTitle}</span>
          <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
            {toWesternDigits(evidence.length)}
          </span>
        </h3>
        <span className="text-[11px] text-slate-500 dark:text-zinc-400">{t.evidenceSortedNote}</span>
      </div>

      <div className="space-y-3">
        {evidence.map((item, index) => {
          const tierInfo = getTierInfo(item.tier);
          const stanceInfo = getStanceInfo(item.stance);
          const StanceIcon = stanceInfo.icon;
          const TierIcon = tierInfo.icon;

          return (
            <div
              key={item.id || index}
              className="rounded-lg bg-white dark:bg-[#151619] border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs hover:border-slate-400 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                {/* Domain & Date */}
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
                  <span className="font-bold text-slate-900 dark:text-zinc-100 font-sans">{item.sourceDomain}</span>
                  {item.sourceDate && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-[11px]">{toWesternDigits(item.sourceDate)}</span>
                    </>
                  )}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border font-medium ${tierInfo.badge}`}
                  >
                    <TierIcon className="h-3 w-3" />
                    <span>{tierInfo.label.split(':')[0]}</span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border font-medium ${stanceInfo.badge}`}
                  >
                    <StanceIcon className="h-3 w-3" />
                    <span>{stanceInfo.label}</span>
                  </span>
                </div>
              </div>

              {/* Title */}
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 mb-2 leading-snug">
                {item.sourceTitle}
              </h4>

              {/* Snippet */}
              <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed bg-slate-50 dark:bg-zinc-900/60 p-3 rounded border border-slate-100 dark:border-zinc-800/80 mb-3 font-serif">
                "{item.sourceSnippet}"
              </p>

              {/* Action / Link */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  {t.reliabilityLabel} {toWesternDigits((item.reliabilityScore * 100).toFixed(0))}%
                </span>
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  <span>{t.openSourceLink}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
