import Link from 'next/link';
import { Megaphone, ArrowRight, MapPin, Calendar, Users, Heart } from 'lucide-react';
import { assetUrl } from '@/lib/api';
import type { PublicOutreach } from '@/lib/site-api';

interface OutreachesSectionProps {
  outreaches: PublicOutreach[];
  showAllLink?: boolean;
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function OutreachesSection({ outreaches, showAllLink }: OutreachesSectionProps) {
  if (!outreaches.length) return null;

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              Outreaches
            </p>
            <h2 className="mt-1 text-3xl font-bold text-slate-900">Reaching Our Community</h2>
            <p className="mt-2 text-slate-600">
              Evangelism, charity, and compassion programs across our city and beyond.
            </p>
          </div>
          {showAllLink && (
            <Link
              href="/our-outreaches"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-900"
            >
              All outreaches <ArrowRight size={16} />
            </Link>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {outreaches.slice(0, 6).map((outreach) => (
            <Link
              key={outreach.id}
              href={`/our-outreaches/${outreach.id}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
            >
              <div className="aspect-[16/10] bg-slate-100">
                {outreach.coverImage ? (
                  <img
                    src={assetUrl(outreach.coverImage)}
                    alt={outreach.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600">
                    <Megaphone size={40} className="text-white/70" />
                  </div>
                )}
              </div>
              <div className="p-5">
                {outreach.typeName && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-flame">
                    {outreach.typeName}
                  </p>
                )}
                <h3 className="mt-1 font-bold text-slate-900 group-hover:text-brand-700">
                  {outreach.title}
                </h3>
                {(outreach.location || outreach.state) && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin size={14} />
                    {[outreach.location, outreach.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {outreach.startAt && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar size={14} />
                    {formatDate(outreach.startAt)}
                  </p>
                )}
                {(outreach.peopleReached != null || outreach.souls != null) && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-brand-700">
                    {outreach.peopleReached != null && (
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {outreach.peopleReached} reached
                      </span>
                    )}
                    {outreach.souls != null && (
                      <span className="flex items-center gap-1">
                        <Heart size={14} />
                        {outreach.souls} souls
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
