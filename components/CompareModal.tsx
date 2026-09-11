'use client';

import React, { useState } from 'react';
import { X, Scale, Check, AlertCircle, ArrowLeftRight, Loader2 } from 'lucide-react';
import { ComparisonResult } from '@/types';
import { Language } from '@/lib/i18n';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const CompareModal: React.FC<CompareModalProps> = ({ isOpen, onClose, lang }) => {
  const [sourceA, setSourceA] = useState('');
  const [sourceB, setSourceB] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCompare = async () => {
    if (!sourceA.trim() || !sourceB.trim()) {
      setError(lang === 'ar' ? 'يرجى إدخال محتوى أو رابط لكلا المصدرين للمقارنة.' : 'Please provide both sources.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceA, sourceB }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to compare');
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#151619] border border-slate-300 dark:border-zinc-800 rounded-lg w-full max-w-3xl p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 [dir=rtl]:left-auto [dir=rtl]:right-auto [dir=rtl]:top-4 [dir=ltr]:right-4 p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-zinc-800">
          <Scale className="h-5 w-5 text-slate-800 dark:text-zinc-200" />
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 font-sans">
              {lang === 'ar' ? 'مقارنة روايتين إخباريتين' : 'Cross-Source Narrative Comparison'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {lang === 'ar'
                ? 'فحص التوافق والاختلاف بين تقريرين وتحديد أيهما يرتكز على مصادر أوثق'
                : 'Compare two news accounts side-by-side to detect agreements, discrepancies and source weight'}
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
              {lang === 'ar' ? 'المصدر (أ) — نص أو رابط:' : 'Source A (Text or URL):'}
            </label>
            <textarea
              rows={4}
              value={sourceA}
              onChange={(e) => setSourceA(e.target.value)}
              placeholder={lang === 'ar' ? 'ألصق الرواية الأولى أو رابط التقرير أ...' : 'Paste report A...'}
              className="w-full bg-slate-50 dark:bg-[#0f1012] text-slate-900 dark:text-zinc-100 rounded p-2.5 text-xs border border-slate-300 dark:border-zinc-800 focus:outline-none focus:border-slate-800 resize-none font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
              {lang === 'ar' ? 'المصدر (ب) — نص أو رابط:' : 'Source B (Text or URL):'}
            </label>
            <textarea
              rows={4}
              value={sourceB}
              onChange={(e) => setSourceB(e.target.value)}
              placeholder={lang === 'ar' ? 'ألصق الرواية الثانية أو رابط التقرير ب...' : 'Paste report B...'}
              className="w-full bg-slate-50 dark:bg-[#0f1012] text-slate-900 dark:text-zinc-100 rounded p-2.5 text-xs border border-slate-300 dark:border-zinc-800 focus:outline-none focus:border-slate-800 resize-none font-sans"
            />
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end mb-4">
          <button
            onClick={handleCompare}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded font-bold text-xs bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-950 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
            <span>{lang === 'ar' ? 'بدء المقارنة الآن' : 'Run Comparison'}</span>
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-zinc-800 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded">
              <strong className="block text-slate-900 dark:text-zinc-100 mb-0.5">
                {lang === 'ar' ? 'التقييم التحريري لقوة الأدلة:' : 'Evidence Weight Assessment:'}
              </strong>
              <p className="text-slate-700 dark:text-zinc-300">{result.strongerExplanation}</p>
            </div>

            <div className="p-3 bg-white dark:bg-[#111215] border border-slate-200 dark:border-zinc-800 rounded">
              <h4 className="font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                <span>{lang === 'ar' ? 'نقاط التوافق بين المصدرين:' : 'Points of Agreement:'}</span>
              </h4>
              <ul className="space-y-1 text-slate-700 dark:text-zinc-300 list-disc list-inside">
                {result.agreements.map((ag, i) => (
                  <li key={i}>{ag}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-white dark:bg-[#111215] border border-slate-200 dark:border-zinc-800 rounded">
              <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{lang === 'ar' ? 'نقاط الاختلاف والتباين:' : 'Points of Divergence:'}</span>
              </h4>
              <ul className="space-y-1 text-slate-700 dark:text-zinc-300 list-disc list-inside">
                {result.divergences.map((div, i) => (
                  <li key={i}>{div}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
