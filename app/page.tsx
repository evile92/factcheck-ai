'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { InputSection } from '@/components/InputSection';
import { ExecutionPipeline } from '@/components/ExecutionPipeline';
import { VerdictCard } from '@/components/VerdictCard';
import { ClaimsBreakdown } from '@/components/ClaimsBreakdown';
import { EvidenceList } from '@/components/EvidenceList';
import { MediaAnalysisView } from '@/components/MediaAnalysisView';
import { ContradictionAlert } from '@/components/ContradictionAlert';
import { CompareModal } from '@/components/CompareModal';
import { HowItWorksModal } from '@/components/HowItWorksModal';
import { HealthDashboardModal } from '@/components/HealthDashboardModal';
import { ShareModal } from '@/components/ShareModal';
import { VerificationResult } from '@/types';
import { Language, translations } from '@/lib/i18n';
import { Shield, Lock } from 'lucide-react';

export default function Home() {
  const [lang, setLang] = useState<Language>('ar');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [result, setResult] = useState<VerificationResult | null>(null);

  // Modals state
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const t = translations[lang];

  // Initialize theme on client mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('fc_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleLanguage = () => {
    const nextLang: Language = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLang;
  };

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fc_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fc_theme', 'light');
    }
  };

  const handleVerify = async (data: {
    inputContent: string;
    inputType: 'text' | 'url' | 'image' | 'video';
    imageBase64?: string;
    imageMime?: string;
  }) => {
    setIsLoading(true);
    setCurrentStage(1);
    setStatusMessage(t.stages[0]?.desc || 'قراءة المحتوى...');
    setResult(null);

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Request failed.');
      }

      if (!response.body) {
        throw new Error('No stream body received.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.type === 'progress') {
                setCurrentStage(payload.stageIndex);
                setStatusMessage(
                  lang === 'en'
                    ? t.stages[payload.stageIndex - 1]?.desc || payload.message
                    : payload.message
                );
              } else if (payload.type === 'result') {
                setResult(payload.data);
                setCurrentStage(7);
              } else if (payload.type === 'error') {
                throw new Error(payload.error);
              }
            } catch {
              // Ignore single malformed line
            }
          }
        }
      }
    } catch (err: any) {
      alert(`Alert: ${err.message || 'Verification connection failed'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0c0d0e] text-slate-900 dark:text-zinc-100 font-sans transition-colors w-full max-w-full overflow-x-hidden">
      {/* Editorial Header */}
      <Header
        onOpenCompare={() => setIsCompareOpen(true)}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        onOpenHealth={() => setIsHealthOpen(true)}
        lang={lang}
        onToggleLanguage={toggleLanguage}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 overflow-hidden">
        {/* Editorial Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="mb-4 flex justify-center">
            <img
              src="/logo.png"
              alt="FactCheck Desk"
              className="h-24 sm:h-28 w-auto object-contain dark:drop-shadow-[0_0_14px_rgba(255,255,255,0.1)]"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-300 dark:border-zinc-800 bg-white dark:bg-[#151619] text-slate-700 dark:text-zinc-300 text-[11px] font-semibold uppercase tracking-wider mb-3 shadow-xs">
            <Shield className="h-3 w-3 text-slate-900 dark:text-zinc-100" />
            <span>{lang === 'ar' ? 'تحقيق استقصائي ومطابقة فورية' : 'Investigative Fact Verification'}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-slate-950 dark:text-white mb-2 leading-tight">
            {t.tagline}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto font-sans">
            {t.subtagline}
          </p>
        </div>

        {/* Input Console */}
        <InputSection onVerify={handleVerify} isLoading={isLoading} lang={lang} />

        {/* Live Execution Pipeline */}
        {isLoading && (
          <ExecutionPipeline currentStageIndex={currentStage} statusMessage={statusMessage} lang={lang} />
        )}

        {/* Results Presentation */}
        {result && (
          <div className="mt-8 space-y-5">
            {/* Verdict Stamp Card */}
            <VerdictCard result={result} onOpenShare={() => setIsShareOpen(true)} lang={lang} />

            {/* Contradiction Notice */}
            {result.contradictions && result.contradictions.length > 0 && (
              <ContradictionAlert contradictions={result.contradictions} lang={lang} />
            )}

            {/* Claims Breakdown */}
            <ClaimsBreakdown claims={result.claims} lang={lang} />

            {/* Media Forensics */}
            {result.mediaAnalysis && (
              <MediaAnalysisView
                imageAnalysis={result.mediaAnalysis.image}
                videoAnalysis={result.mediaAnalysis.video}
                lang={lang}
              />
            )}

            {/* Evidence & Sources Dossier */}
            <EvidenceList evidence={result.evidence} lang={lang} />
          </div>
        )}

        {/* Quick Example Scenarios */}
        {!result && !isLoading && (
          <div className="max-w-4xl mx-auto mt-10 pt-6 border-t border-slate-200 dark:border-zinc-800">
            <span className="text-xs font-bold text-slate-600 dark:text-zinc-400 block mb-2.5">
              {t.examplesTitle}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() =>
                  handleVerify({
                    inputContent: t.example1Text,
                    inputType: 'text',
                  })
                }
                className="p-3 rounded-md bg-white dark:bg-[#151619] hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-right [dir=ltr]:text-left transition-colors text-xs shadow-xs"
              >
                <span className="font-bold text-slate-900 dark:text-zinc-100 block mb-1">
                  {t.example1Title}
                </span>
                <span className="text-slate-600 dark:text-zinc-400 font-serif">"{t.example1Text}"</span>
              </button>

              <button
                onClick={() =>
                  handleVerify({
                    inputContent: t.example2Text,
                    inputType: 'text',
                  })
                }
                className="p-3 rounded-md bg-white dark:bg-[#151619] hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-right [dir=ltr]:text-left transition-colors text-xs shadow-xs"
              >
                <span className="font-bold text-slate-900 dark:text-zinc-100 block mb-1">
                  {t.example2Title}
                </span>
                <span className="text-slate-600 dark:text-zinc-400 font-serif">"{t.example2Text}"</span>
              </button>

              <button
                onClick={() =>
                  handleVerify({
                    inputContent: t.example3Text,
                    inputType: 'text',
                  })
                }
                className="p-3 rounded-md bg-white dark:bg-[#151619] hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-right [dir=ltr]:text-left transition-colors text-xs shadow-xs"
              >
                <span className="font-bold text-slate-900 dark:text-zinc-100 block mb-1">
                  {t.example3Title}
                </span>
                <span className="text-slate-600 dark:text-zinc-400 font-serif">"{t.example3Text}"</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#111215] py-5 mt-12 text-xs text-slate-500 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>{t.privacyFooter}</span>
          </div>
          <div>
            <span>{t.rightsFooter}</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CompareModal isOpen={isCompareOpen} onClose={() => setIsCompareOpen(false)} lang={lang} />
      <HowItWorksModal isOpen={isHowItWorksOpen} onClose={() => setIsHowItWorksOpen(false)} lang={lang} />
      <HealthDashboardModal isOpen={isHealthOpen} onClose={() => setIsHealthOpen(false)} lang={lang} />
      {result && (
        <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} result={result} lang={lang} />
      )}
    </div>
  );
}
