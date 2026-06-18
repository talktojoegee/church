import Link from 'next/link';
import { Quote } from 'lucide-react';
import type { PublicTestimony } from '@/lib/site-api';

interface TestimonyGridProps {
  testimonies: PublicTestimony[];
  showAllLink?: boolean;
}

export function TestimonyGrid({ testimonies, showAllLink }: TestimonyGridProps) {
  if (!testimonies.length) return null;

  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              Testimonies
            </p>
            <h2 className="mt-1 text-3xl font-bold text-slate-900">God at Work</h2>
          </div>
          {showAllLink && (
            <Link
              href="/stories"
              className="text-sm font-semibold text-brand-700 hover:text-brand-900"
            >
              View all →
            </Link>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonies.map((t) => (
            <article
              key={t.id}
              className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <Quote className="absolute right-4 top-4 text-brand-100" size={40} />
              <h3 className="pr-8 text-lg font-semibold text-slate-900">{t.title}</h3>
              <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-600">{t.body}</p>
              <p className="mt-4 text-sm font-medium text-brand-700">
                — {t.authorName || 'Anonymous'}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
