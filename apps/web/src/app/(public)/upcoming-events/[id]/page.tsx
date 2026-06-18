import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchPublicEvent } from '@/lib/site-api';
import { PageHero } from '@/components/public/PageHero';
import { EventDetailInfo, EventRegisterForm } from '@/components/public/EventRegisterForm';

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await fetchPublicEvent(id);
  if (!event) notFound();

  return (
    <>
      <PageHero title={event.title} subtitle={event.isPast ? 'Past event' : 'Register below'} />
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div>
          <EventDetailInfo event={event} />
          <Link href="/upcoming-events" className="mt-8 inline-block text-sm font-semibold text-brand-700">
            ← All events
          </Link>
        </div>
        <div>
          <EventRegisterForm eventId={event.id} canRegister={event.canRegister} />
        </div>
      </section>
    </>
  );
}
