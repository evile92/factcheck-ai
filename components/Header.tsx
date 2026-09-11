'use client';

import React from 'react';
import { Newspaper, Scale, BookOpen, Activity, Moon, Sun, Globe } from 'lucide-react';
import { Language, translations } from '@/lib/i18n';
import { formatDisplayDate } from '@/lib/text-utils';

interface HeaderProps {
  onOpenCompare: () => void;
  onOpenHowItWorks: () => void;
  onOpenHealth: () => void;
  lang: Language;
  onToggleLanguage: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCompare,
  onOpenHowItWorks,
  onOpenHealth,
  lang,
  onToggleLanguage,
  isDark,
  onToggleTheme,
}) => {
  const t = translations[lang];
  const currentDate = formatDisplayDate(new Date(), lang);

  return (
    <header className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#111215] sticky top-0 z-40 transition-colors w-full max-w-full overflow-hidden">
      {/* Top micro-bar: Date & Edition */}
      <div className="border-b border-slate-100 dark:border-zinc-800/60 text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 py-1 px-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <span className="font-medium font-sans truncate">{currentDate}</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline font-mono uppercase tracking-wider">
            {lang === 'ar' ? 'النسخة التحريرية المستقلة' : 'Independent Editorial Edition'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
            <span className="hidden xs:inline">{lang === 'ar' ? 'المصادر متصلة' : 'Live Wires'}</span>
          </span>
        </div>
      </div>

      {/* Main Masthead Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-md bg-slate-900 dark:bg-zinc-100 text-white dark:text-slate-950 flex items-center justify-center font-serif font-black text-base sm:text-lg shadow-xs">
            <Newspaper className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif font-black text-lg sm:text-2xl text-slate-900 dark:text-zinc-50 tracking-tight">
                FACTCHECK
              </span>
              <span className="text-[10px] font-sans font-bold uppercase px-1 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                DESK
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={onOpenCompare}
            className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-md text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors"
            title={t.navCompare}
          >
            <Scale className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400" />
            <span className="hidden md:inline">{t.navCompare}</span>
          </button>

          <button
            onClick={onOpenHowItWorks}
            className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-md text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors"
            title={t.navMethodology}
          >
            <BookOpen className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400" />
            <span className="hidden md:inline">{t.navMethodology}</span>
          </button>

          <button
            onClick={onOpenHealth}
            className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-md text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors"
            title={t.navHealth}
          >
            <Activity className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400" />
            <span className="hidden md:inline">{t.navHealth}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 sm:p-2 rounded-md text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors"
            title={isDark ? t.navThemeLight : t.navThemeDark}
          >
            {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-slate-700" />}
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold rounded-md text-slate-900 dark:text-white bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 transition-colors"
            title="Language"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="text-[11px] sm:text-xs font-sans">{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
