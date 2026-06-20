import Link from 'next/link';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import type { PublicEvent } from '@/lib/site-api';

interface EventsSectionProps {
  events: PublicEvent[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const CARD_COLORS = [
  'border-l-brand-600 bg-gradient-to-br from-brand-50 to-white',
  'border-l-flame bg-gradient-to-br from-rose-50 to-white',
  'border-l-gold bg-gradient-to-br from-amber-50 to-white',
  'border-l-brand-500 bg-gradient-to-br from-indigo-50 to-white',
];

export function EventsSection({ events }: EventsSectionProps) {
  const upcoming = events.filter((e) => new Date(e.startAt) >= new Date());

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-brand-50/50 py-16 sm:py-20">
      <div className="absolute -right-20 top-10 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute -left-20 bottom-10 h-64 w-64 rounded-full bg-flame/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-flame">Events</p>
            <h2 className="mt-1 text-3xl font-bold text-brand-900">Upcoming Gatherings</h2>
            <p className="mt-2 max-w-xl text-slate-600">
              Join us for worship services, conferences, outreaches, and special programs.
            </p>
          </div>
          <Link
            href="/upcoming-events"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-900"
          >
            All events <ArrowRight size={16} />
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-200 bg-white/80 p-10 text-center">
            <Calendar className="mx-auto mb-3 text-brand-300" size={40} />
            <p className="text-slate-600">No upcoming events right now. Check back soon!</p>
            <Link href="/contact" className="mt-4 inline-block text-sm font-semibold text-brand-700">
              Contact us for service times →
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.slice(0, 4).map((event, i) => (
              <Link
                key={event.id}
                href={`/upcoming-events/${event.id}`}
                className={`block rounded-xl border-l-4 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${CARD_COLORS[i % CARD_COLORS.length]}`}
              >
                <h3 className="font-bold text-slate-900">{event.title}</h3>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-700">
                  <Calendar size={14} />
                  {formatDate(event.startAt)}
                </p>
                {event.location && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin size={14} />
                    {event.location}
                  </p>
                )}
                {event.capacity != null && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Users size={14} />
                    {event.registrationCount ?? 0} / {event.capacity} registered
                  </p>
                )}
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-flame">
                  View & register <ArrowRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
