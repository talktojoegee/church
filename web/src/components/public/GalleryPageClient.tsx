'use client';

import { useState } from 'react';
import { assetUrl } from '@/lib/api';
import type { GalleryImage } from '@/lib/site-api';
import { PageHero } from '@/components/public/PageHero';
import { X } from 'lucide-react';

export function GalleryPageClient({ images }: { images: GalleryImage[] }) {
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);

  return (
    <>
      <PageHero title="Gallery" subtitle="Moments from worship, fellowship, and outreach" />
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {images.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-slate-500">
            Gallery photos will appear here once uploaded in the admin area.
          </p>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightbox(img)}
                className="mb-4 block w-full overflow-hidden rounded-xl bg-slate-100 text-left shadow-sm transition hover:shadow-lg"
              >
                <img
                  src={assetUrl(img.imageUrl)}
                  alt={img.title}
                  className="w-full object-cover"
                />
                <div className="p-3">
                  <p className="font-semibold text-slate-900">{img.title}</p>
                  {img.caption && (
                    <p className="mt-1 text-sm text-slate-500">{img.caption}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
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
          <img
            src={assetUrl(lightbox.imageUrl)}
            alt={lightbox.title}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
