import Link from 'next/link';
import { Mic2, Play, ArrowRight } from 'lucide-react';
import type { PublicSermon } from '@/lib/site-api';

interface SermonsSectionProps {
  sermons: PublicSermon[];
}

function formatDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SermonsSection({ sermons }: SermonsSectionProps) {
  if (!sermons.length) return null;

  return (
    <section className="bg-brand-900 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-gold">Messages</p>
            <h2 className="mt-1 text-3xl font-bold">Recent Sermons</h2>
            <p className="mt-2 text-white/75">Be encouraged by the preached word.</p>
          </div>
          <Link
            href="/messages"
            className="inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-light"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {sermons.map((s, i) => (
            <Link
              key={s.id}
              href={`/messages/${s.id}`}
              className={`group block rounded-2xl border border-white/10 p-6 backdrop-blur-sm transition hover:border-gold/40 hover:bg-white/10 ${
                i === 0 ? 'bg-gradient-to-br from-flame/30 to-brand-800/50' : 'bg-white/5'
              }`}
            >
              <Mic2 className="mb-3 text-gold" size={28} />
              <h3 className="text-lg font-bold group-hover:text-gold-light">{s.title}</h3>
              {s.speaker && <p className="mt-1 text-sm text-gold/90">{s.speaker}</p>}
              {s.preachedAt && (
                <p className="mt-2 text-xs text-white/60">{formatDate(s.preachedAt)}</p>
              )}
              {s.summary && (
                <p className="mt-3 line-clamp-3 text-sm text-white/80">{s.summary}</p>
              )}
              {(s.videoUrl || s.audioUrl) && (
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold group-hover:text-gold-light">
                  <Play size={14} /> Listen / watch
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
