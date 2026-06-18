import Link from 'next/link';
import { ArrowRight, CalendarDays, Mic2, User } from 'lucide-react';
import { fetchPublicSermons } from '@/lib/site-api';
import { PageHero } from '@/components/public/PageHero';

function formatDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function MessagesPage() {
  const sermons = (await fetchPublicSermons()) ?? [];

  return (
    <>
      <PageHero
        title="Sermons & Messages"
        subtitle="Listen to recent preached word and be encouraged"
      />
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {sermons.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
            No sermons published yet. Check back soon!
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sermons.map((sermon) => (
              <Link
                key={sermon.id}
                href={`/messages/${sermon.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <Mic2 className="mb-3 text-brand-600" size={28} />
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-700">
                  {sermon.title}
                </h3>
                {sermon.speaker && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-700">
                    <User size={14} />
                    {sermon.speaker}
                  </p>
                )}
                {sermon.preachedAt && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <CalendarDays size={14} />
                    {formatDate(sermon.preachedAt)}
                  </p>
                )}
                {sermon.summary && (
                  <p className="mt-3 line-clamp-3 text-sm text-slate-600">{sermon.summary}</p>
                )}
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-flame">
                  Listen & read <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
