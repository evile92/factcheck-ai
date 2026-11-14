'use client';

import React, { useEffect, useState } from 'react';
import { X, Activity, RefreshCw, CheckCircle2, AlertTriangle, Database } from 'lucide-react';
import { ProviderHealth } from '@/types';
import { Language } from '@/lib/i18n';
import { toWesternDigits } from '@/lib/text-utils';

interface HealthDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const HealthDashboardModal: React.FC<HealthDashboardModalProps> = ({ isOpen, onClose, lang }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    status: string;
    timestamp: string;
    cache: { verificationCacheItems: number; providerCacheItems: number };
    providers: ProviderHealth[];
  } | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#151619] border border-slate-300 dark:border-zinc-800 rounded-lg w-full max-w-3xl p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 [dir=rtl]:left-auto [dir=rtl]:right-auto [dir=rtl]:top-4 [dir=ltr]:right-4 p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-slate-800 dark:text-zinc-200" />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 font-sans">
                {lang === 'ar' ? 'سجل المزودات وقواعد البيانات' : 'Source & Database Registry'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {lang === 'ar' ? 'متابعة حية لحالة الاتصال وسرعة الاستجابة' : 'Live status of integrated verification APIs'}
              </p>
            </div>
          </div>

          <button
            onClick={fetchHealth}
            disabled={loading}
            className="p-1.5 rounded border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800">
              <span className="text-[10px] text-slate-500 block mb-0.5">{lang === 'ar' ? 'الحالة العامة:' : 'System Status:'}</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase font-mono">{data.status}</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800">
              <span className="text-[10px] text-slate-500 block mb-0.5">{lang === 'ar' ? 'سجلات الذاكرة (Cache):' : 'Cache Entries:'}</span>
              <span className="font-bold text-slate-900 dark:text-zinc-100 font-mono">
                {toWesternDigits(data.cache.verificationCacheItems)} verified / {toWesternDigits(data.cache.providerCacheItems)} queries
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 block mb-0.5">{lang === 'ar' ? 'بروتوكول الطوارئ:' : 'Fallback System:'}</span>
              <span className="font-bold text-slate-900 dark:text-zinc-100">{lang === 'ar' ? 'تلقائي ونشط 100%' : 'Active'}</span>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded border border-slate-200 dark:border-zinc-800 text-xs">
          <table className="w-full text-right [dir=ltr]:text-left">
            <thead className="bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800 text-[11px]">
              <tr>
                <th className="py-2.5 px-3">{lang === 'ar' ? 'المزود / القاعدة' : 'Provider'}</th>
                <th className="py-2.5 px-3">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-2.5 px-3">{lang === 'ar' ? 'زمن الاستجابة' : 'Latency'}</th>
                <th className="py-2.5 px-3">{lang === 'ar' ? 'المفتاح' : 'Key'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {data?.providers.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-zinc-100">{p.name}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium text-[10px] ${
                        p.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : p.status === 'offline'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}
                    >
                      {p.status === 'active' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      <span>
                        {p.status === 'active'
                          ? lang === 'ar'
                            ? 'نشط'
                            : 'Active'
                          : p.status === 'offline'
                          ? lang === 'ar'
                            ? 'متوقف'
                            : 'Offline'
                          : lang === 'ar'
                          ? 'بديل نشط'
                          : 'Fallback'}
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-zinc-400">{toWesternDigits(p.latencyMs)} ms</td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-zinc-400">
                    {p.requiresKey ? (p.hasKey ? 'Configured ✅' : 'Optional (Fallback) ✅') : 'Not required ✅'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
