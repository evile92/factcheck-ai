import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FactCheck AI | مرصد تدقيق الحقائق',
  description: 'منظومة استقصائية مستقلة للتحقق من صحة الأخبار والنصوص والصور والفيديوهات عبر استرجاع الأدلة الموثقة.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased selection:bg-slate-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
