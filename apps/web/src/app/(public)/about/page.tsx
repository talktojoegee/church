import { notFound } from 'next/navigation';
import { fetchPublicAbout } from '@/lib/site-api';
import { PageHero } from '@/components/public/PageHero';
import { AboutPageContent } from '@/components/public/AboutPageContent';

export default async function AboutPage() {
  const data = await fetchPublicAbout();
  if (!data) notFound();

  const title = data.page?.title ?? 'About Us';
  const subtitle = data.page?.subtitle ?? 'Our story, beliefs, and leadership';

  return (
    <>
      <PageHero title={title} subtitle={subtitle} />
      <AboutPageContent data={data} />
    </>
  );
}
