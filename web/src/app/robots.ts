import type { MetadataRoute } from 'next';
import { fetchPublicBranding } from '@/lib/branding';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const branding = await fetchPublicBranding();
  const allowCrawl = branding?.seo?.allowCrawl !== false;

  if (!allowCrawl) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/members/', '/finance/', '/hr/', '/settings/', '/audit/', '/users/', '/roles/'],
      },
    ],
    sitemap: undefined,
  };
}
