'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  MapPin,
  Calendar,
  Users,
  Heart,
  ArrowRight,
  X,
} from 'lucide-react';
import { assetUrl } from '@/lib/api';
import type { PublicOutreach } from '@/lib/site-api';
import { PageHero } from '@/components/public/PageHero';

function formatDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-NG', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function OutreachesPageClient({ outreaches }: { outreaches: PublicOutreach[] }) {
  return (
    <>
      <PageHero
        title="Outreaches"
        subtitle="Evangelism, charity, and compassion programs making a difference in our communities"
      />
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {outreaches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-slate-500">
            Outreach reports will appear here once recorded in the admin area.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {outreaches.map((outreach) => (
              <Link
                key={outreach.id}
                href={`/our-outreaches/${outreach.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-200 hover:shadow-md"
              >
                <div className="aspect-[16/10] bg-slate-100">
                  {outreach.coverImage ? (
                    <img
                      src={assetUrl(outreach.coverImage)}
                      alt={outreach.title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600">
                      <Megaphone size={36} className="text-white/70" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  {outreach.typeName && (
                    <p className="text-xs font-semibold uppercase tracking-wider text-flame">
                      {outreach.typeName}
                    </p>
                  )}
                  <h2 className="mt-1 text-lg font-bold text-slate-900 group-hover:text-brand-700">
                    {outreach.title}
                  </h2>
                  {outreach.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {outreach.description}
                    </p>
                  )}
                  <OutreachMeta outreach={outreach} className="mt-3" />
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                    View details <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export function OutreachDetailClient({ outreach }: { outreach: PublicOutreach }) {
  const [lightbox, setLightbox] = useState<{
    url: string;
    caption?: string | null;
  } | null>(null);
  const images = outreach.images ?? [];

  return (
    <>
      <PageHero
        title={outreach.title}
        subtitle={
          outreach.typeName
            ? `${outreach.typeName}${outreach.branchName ? ` · ${outreach.branchName}` : ''}`
            : outreach.branchName
        }
      />
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <Link
          href="/our-outreaches"
          className="mb-8 inline-block text-sm font-semibold text-brand-700 hover:text-brand-900"
        >
          ← All outreaches
        </Link>

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {outreach.description && (
              <div>
                <h2 className="text-lg font-bold text-brand-900">About this outreach</h2>
                <p className="mt-3 leading-relaxed text-slate-600">{outreach.description}</p>
              </div>
            )}

            {outreach.outcome && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-lg font-bold text-brand-900">Outcome</h2>
                <p className="mt-3 leading-relaxed text-slate-600">{outreach.outcome}</p>
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold text-brand-900">
                Gallery
                {images.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({images.length} photo{images.length === 1 ? '' : 's'})
                  </span>
                )}
              </h2>
              {images.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  No photos have been added for this outreach yet.
                </p>
              ) : (
                <div className="mt-4 columns-1 gap-4 sm:columns-2">
                  {images.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setLightbox(img)}
                      className="mb-4 block w-full overflow-hidden rounded-xl bg-slate-100 text-left shadow-sm transition hover:shadow-lg"
                    >
                      <img
                        src={assetUrl(img.url)}
                        alt={img.caption ?? outreach.title}
                        className="w-full object-cover"
                      />
                      {img.caption && (
                        <p className="p-3 text-sm text-slate-600">{img.caption}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            {outreach.coverImage && (
              <img
                src={assetUrl(outreach.coverImage)}
                alt={outreach.title}
                className="w-full rounded-2xl object-cover shadow-md"
              />
            )}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-brand-900">Details</h3>
              <OutreachMeta outreach={outreach} className="mt-4" stacked />
            </div>
          </aside>
        </div>
      </section>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <div className="max-h-[90vh] max-w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={assetUrl(lightbox.url)}
              alt={lightbox.caption ?? outreach.title}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
            {lightbox.caption && (
              <p className="mt-3 text-center text-sm text-white/90">{lightbox.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function OutreachMeta({
  outreach,
  className = '',
  stacked = false,
}: {
  outreach: PublicOutreach;
  className?: string;
  stacked?: boolean;
}) {
  const items = [
    outreach.startAt && {
      icon: Calendar,
      label: formatDate(outreach.startAt),
    },
    (outreach.location || outreach.state) && {
      icon: MapPin,
      label: [outreach.location, outreach.state].filter(Boolean).join(', '),
    },
    outreach.peopleReached != null && {
      icon: Users,
      label: `${outreach.peopleReached} people reached`,
    },
    outreach.souls != null && {
      icon: Heart,
      label: `${outreach.souls} souls won`,
    },
  ].filter(Boolean) as Array<{ icon: typeof Calendar; label: string }>;

  return (
    <ul
      className={`${stacked ? 'space-y-3' : 'flex flex-wrap gap-3'} text-sm text-slate-600 ${className}`}
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <item.icon size={16} className="shrink-0 text-brand-600" />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
