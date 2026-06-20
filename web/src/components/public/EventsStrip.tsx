import { Calendar, MapPin } from 'lucide-react';
import type { PublicEvent } from '@/lib/site-api';

interface EventsStripProps {
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

export function EventsStrip({ events }: EventsStripProps) {
  if (!events.length) return null;

  return (
    <section className="border-y border-slate-200 bg-white py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
          Upcoming Events
        </p>
        <h2 className="mt-1 mb-8 text-2xl font-bold text-slate-900">Join Us</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((event) => (
            <article
              key={event.id}
              className="rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:shadow-sm"
            >
              <h3 className="font-semibold text-slate-900">{event.title}</h3>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar size={14} className="text-gold" />
                {formatDate(event.startAt)}
              </p>
              {event.location && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={14} className="text-gold" />
                  {event.location}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
