import { fetchPublicHome, fetchPublicAbout } from '@/lib/site-api';
import { HeroSlider } from '@/components/public/HeroSlider';
import { ServiceTimesBanner } from '@/components/public/ServiceTimesBanner';
import { WelcomeIntro } from '@/components/public/WelcomeIntro';
import { HomeSections } from '@/components/public/HomeSections';
import { EventsSection } from '@/components/public/EventsSection';
import { SermonsSection } from '@/components/public/SermonsSection';
import { OutreachesSection } from '@/components/public/OutreachesSection';
import { TestimonyGrid } from '@/components/public/TestimonyGrid';
import { VisitInvite } from '@/components/public/VisitInvite';

export default async function HomePage() {
  const [data, about] = await Promise.all([fetchPublicHome(), fetchPublicAbout()]);
  const branding = data?.branding;

  return (
    <>
      <HeroSlider slides={data?.slides ?? []} churchName={branding?.name} />
      <ServiceTimesBanner
        serviceTimes={branding?.serviceTimes}
        address={branding?.address}
        tagline={branding?.tagline}
      />
      <WelcomeIntro churchName={branding?.name} pastor={about?.pastor} />
      <HomeSections sections={data?.sections ?? []} />
      <EventsSection events={data?.events ?? []} />
      <SermonsSection sermons={data?.sermons ?? []} />
      <OutreachesSection outreaches={data?.outreaches ?? []} showAllLink />
      <TestimonyGrid testimonies={data?.testimonies ?? []} showAllLink />
      <VisitInvite serviceTimes={branding?.serviceTimes} address={branding?.address} />
    </>
  );
}
