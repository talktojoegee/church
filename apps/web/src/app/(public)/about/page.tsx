import { notFound } from 'next/navigation';
import { fetchPublicPage } from '@/lib/site-api';
import { PageHero } from '@/components/public/PageHero';
import { CmsHtml } from '@/components/public/CmsHtml';

export default async function AboutPage() {
  const page = await fetchPublicPage('about');
  if (!page) notFound();

  return (
    <>
      <PageHero title={page.title} subtitle={page.subtitle} />
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <CmsHtml html={page.body} />
      </section>
    </>
  );
}
