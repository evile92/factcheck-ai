'use client';

import React from 'react';
import { X, BookOpen, CheckCircle, Search, Layers, Calendar, Image as ImageIcon, Award } from 'lucide-react';
import { Language } from '@/lib/i18n';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;

  const steps =
    lang === 'ar'
      ? [
          {
            title: '1. تفكيك الادعاء واستخراجه (Claim Extraction)',
            desc: 'فصل صلب الادعاء عن لغة الإثارة والتهويل، وتصنيفه موضوعياً ضمن 15 تصنيفاً إخبارياً متخصصاً.',
          },
          {
            title: '2. الاستعلام متعدد المصادر واللغات (Multi-Lingual Search)',
            desc: 'البحث المتقاطع بالتوازي في قواعد بيانات التحقق الدولية (Google FactCheck)، ومستودع الأحداث العالمية (GDELT)، وويكيبيديا الرسمية، وموجز الأخبار المباشر، ومراجع الأبحاث المحكمة (CrossRef).',
          },
          {
            title: '3. محرك تقييم الموثوقية خماسي المستويات (5-Tier Engine)',
            desc: 'تصنيف المصادر حسب قربها من الحدث واستقلاليتها: جهات رسمية وعلمية (المستوى 1)، وكالات أنباء عالمية كبرى (المستوى 2)، صحف رئيسية (المستوى 3)، مواقع عامة (المستوى 4)، ومنصات ساخرة أو مشبوهة (المستوى 5).',
          },
          {
            title: '4. التحقق من السياق والتاريخ الأصلي (First Seen Detection)',
            desc: 'رصد تدوير الصور ومقاطع الفيديو القديمة وكشف متى وأين نُشر المحتوى للمرة الأولى لمنع التضليل الزمني.',
          },
          {
            title: '5. الفحص الجنائي للوسائط (Forensics)',
            desc: 'استخراج النصوص من الصور عبر تقنية OCR، وفحص بيانات الكاميرا (EXIF)، وتحليل مستويات الضغط والتلاعب الرقمي.',
          },
          {
            title: '6. إصدار الحكم التحريري الموضوعي (Evidence-First)',
            desc: 'قاعدة صارمة: لا يمكن إصدار حكم أو الاستشهاد بمعلومة دون وجود رابط ومصدر حقيقي مسترجع. وفي حال عدم كفاية الأدلة يصدر حكم صريح بـ "غير مؤكد".',
          },
        ]
      : [
          {
            title: '1. Claim Extraction & Deconstruction',
            desc: 'Isolating the core factual claim from sensationalized language and categorizing it across 15 domain taxonomies.',
          },
          {
            title: '2. Multi-Source Cross-Lingual Retrieval',
            desc: 'Concurrent querying across Google FactCheck ClaimReview, GDELT Global Database, Wikipedia REST API, Google News RSS, and peer-reviewed CrossRef DOIs.',
          },
          {
            title: '3. 5-Tier Source Credibility Evaluation',
            desc: 'Rating sources by journalistic integrity and proximity to the event: Official/Gov/Academic (Tier 1), Global Wire Services (Tier 2), Mainstream News (Tier 3), Secondary Blogs (Tier 4), and Satire (Tier 5).',
          },
          {
            title: '4. Original Context & Recycled Media Detection',
            desc: 'Identifying first-seen publication dates to catch old media (e.g. 2019 events) re-circulated as breaking news.',
          },
          {
            title: '5. Technical Media Forensics',
            desc: 'Multilingual OCR text extraction, EXIF camera metadata inspection, and digital manipulation indicators.',
          },
          {
            title: '6. Objective Evidence-First Verdict',
            desc: 'Zero hallucinated sources. If insufficient corroborating records are retrieved, the system explicitly rules UNVERIFIED rather than guessing.',
          },
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#151619] border border-slate-300 dark:border-zinc-800 rounded-lg w-full max-w-2xl p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 [dir=rtl]:left-auto [dir=rtl]:right-auto [dir=rtl]:top-4 [dir=ltr]:right-4 p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-zinc-800">
          <BookOpen className="h-5 w-5 text-slate-800 dark:text-zinc-200" />
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 font-sans">
              {lang === 'ar' ? 'منهجية الفحص والتحقق التحريري' : 'Editorial Fact-Checking Methodology'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {lang === 'ar' ? 'معايير الشفافية ومنع التخمين أو اختلاق المصادر' : 'Standards for evidence-first verification'}
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {steps.map((step, idx) => (
            <div key={idx} className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded border border-slate-200 dark:border-zinc-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 mb-1">{step.title}</h4>
              <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-serif">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-950 text-xs font-bold transition-colors"
          >
            {lang === 'ar' ? 'إغلاق الدليل' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
