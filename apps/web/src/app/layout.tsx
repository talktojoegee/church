import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { fetchPublicBranding } from '@/lib/branding';
import { assetUrl } from '@/lib/api';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await fetchPublicBranding();
  const title = branding?.seo?.title || branding?.name || 'Church Management System';
  const description =
    branding?.seo?.description ||
    'Manage finance, HR, payroll, attendance, members, sermons and more.';
  const allowCrawl = branding?.seo?.allowCrawl !== false;
  const ogImage = branding?.seo?.ogImage ? assetUrl(branding.seo.ogImage) : undefined;

  return {
    title,
    description,
    keywords: branding?.seo?.keywords || undefined,
    robots: allowCrawl ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
