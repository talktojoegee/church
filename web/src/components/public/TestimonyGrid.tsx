import Link from 'next/link';
import { Quote, Star } from 'lucide-react';
import type { PublicTestimony } from '@/lib/site-api';

interface TestimonyGridProps {
  testimonies: PublicTestimony[];
  showAllLink?: boolean;
}

export function TestimonyGrid({ testimonies, showAllLink }: TestimonyGridProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 py-16 text-white sm:py-20">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-gold blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-flame blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-gold">Testimonies</p>
            <h2 className="mt-1 text-3xl font-bold">God at Work</h2>
            <p className="mt-2 max-w-lg text-white/80">
              Real stories of healing, salvation, and breakthrough from our church family.
            </p>
          </div>
          {showAllLink && (
            <Link
              href="/stories"
              className="rounded-full border border-gold/50 px-5 py-2 text-sm font-semibold text-gold hover:bg-gold/10"
            >
              Read all testimonies →
            </Link>
          )}
        </div>

        {testimonies.length === 0 ? (
          <div className="rounded-2xl border border-white/20 bg-white/5 p-10 text-center">
            <p className="text-white/80">Testimonies will appear here once published.</p>
            <Link href="/stories/submit" className="mt-4 inline-block text-sm font-semibold text-gold">
              Share your testimony →
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {testimonies.map((t) => (
              <article
                key={t.id}
                className="relative rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm transition hover:bg-white/15"
              >
                {t.isFeatured && (
                  <Star className="absolute right-4 top-4 fill-gold text-gold" size={18} />
                )}
                <Quote className="mb-3 text-gold/40" size={32} />
                <h3 className="pr-6 text-lg font-semibold">{t.title}</h3>
                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-white/85">{t.body}</p>
                <p className="mt-4 text-sm font-medium text-gold">
                  — {t.authorName || 'Anonymous'}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
