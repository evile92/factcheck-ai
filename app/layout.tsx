import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://factcheck-desk.netlify.app'),
  title: 'FactCheck Desk | مرصد تدقيق الحقائق',
  description: 'منظومة استقصائية مستقلة للتحقق من صحة الأخبار والنصوص والصور والفيديوهات عبر استرجاع الأدلة الموثقة.',
  openGraph: {
    title: 'FactCheck Desk | مرصد تدقيق الحقائق',
    description: 'منظومة استقصائية مستقلة للتحقق من صحة الأخبار والنصوص والصور والفيديوهات عبر استرجاع الأدلة الموثقة.',
    images: [{ url: '/logo.png', width: 1024, height: 935, alt: 'FactCheck Desk Logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FactCheck Desk | مرصد تدقيق الحقائق',
    description: 'منظومة استقصائية مستقلة للتحقق من صحة الأخبار والنصوص والصور والفيديوهات عبر استرجاع الأدلة الموثقة.',
    images: ['/logo.png'],
  },
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
