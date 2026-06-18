import { fetchPublicHome } from '@/lib/site-api';
import { HeroSlider } from '@/components/public/HeroSlider';
import { HomeSections } from '@/components/public/HomeSections';
import { TestimonyGrid } from '@/components/public/TestimonyGrid';
import { EventsStrip } from '@/components/public/EventsStrip';

export default async function HomePage() {
  const data = await fetchPublicHome();

  return (
    <>
      <HeroSlider slides={data?.slides ?? []} />
      <HomeSections sections={data?.sections ?? []} />
      <EventsStrip events={data?.events ?? []} />
      <TestimonyGrid testimonies={data?.testimonies ?? []} showAllLink />
    </>
  );
}
