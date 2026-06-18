import Link from 'next/link';
import { Images, ArrowRight } from 'lucide-react';
import { assetUrl } from '@/lib/api';
import type { GalleryImage } from '@/lib/site-api';

interface GallerySectionProps {
  images: GalleryImage[];
  showAllLink?: boolean;
}

export function GallerySection({ images, showAllLink }: GallerySectionProps) {
  if (!images.length) return null;

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Gallery</p>
            <h2 className="mt-1 text-3xl font-bold text-slate-900">Life at Church</h2>
            <p className="mt-2 text-slate-600">Worship, fellowship, outreaches, and memorable moments.</p>
          </div>
          {showAllLink && (
            <Link
              href="/gallery"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-900"
            >
              View gallery <ArrowRight size={16} />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {images.slice(0, 8).map((img, i) => (
            <Link
              key={img.id}
              href="/gallery"
              className={`group relative overflow-hidden rounded-xl bg-slate-100 ${
                i === 0 ? 'col-span-2 row-span-2 aspect-square md:aspect-auto md:min-h-[280px]' : 'aspect-square'
              }`}
            >
              <img
                src={assetUrl(img.imageUrl)}
                alt={img.title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-900/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 transition group-hover:opacity-100">
                <p className="text-sm font-semibold">{img.title}</p>
              </div>
            </Link>
          ))}
        </div>

        {!showAllLink && images.length === 0 && (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 py-16 text-slate-400">
            <Images size={48} />
            <p className="mt-2">Gallery coming soon</p>
          </div>
        )}
      </div>
    </section>
  );
}
