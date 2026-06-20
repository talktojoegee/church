import Link from 'next/link';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import { fetchPublicEvents } from '@/lib/site-api';
import { PageHero } from '@/components/public/PageHero';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function EventsPage() {
  const events = (await fetchPublicEvents()) ?? [];
  const upcoming = events.filter((e) => !e.isPast);
  const past = events.filter((e) => e.isPast);

  return (
    <>
      <PageHero
        title="Events"
        subtitle="Worship services, conferences, outreaches, and special programs"
      />
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="mb-6 text-xl font-bold text-brand-900">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
            No upcoming events scheduled. Check back soon!
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {upcoming.map((event) => (
              <Link
                key={event.id}
                href={`/upcoming-events/${event.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-700">
                  {event.title}
                </h3>
                <p className="mt-2 flex items-center gap-2 text-sm text-brand-700">
                  <Calendar size={16} className="text-gold" />
                  {formatDate(event.startAt)}
                </p>
                {event.location && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <MapPin size={16} />
                    {event.location}
                  </p>
                )}
                {event.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">{event.description}</p>
                )}
                {event.capacity != null && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <Users size={14} />
                    {event.registrationCount ?? 0} registered · {event.capacity} capacity
                  </p>
                )}
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-flame">
                  View & register <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mb-6 mt-14 text-xl font-bold text-slate-700">Past Events</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {past.slice(0, 6).map((event) => (
                <Link
                  key={event.id}
                  href={`/upcoming-events/${event.id}`}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4 opacity-80 hover:opacity-100"
                >
                  <h3 className="font-semibold text-slate-800">{event.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(event.startAt)}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
