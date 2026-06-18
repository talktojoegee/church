import Link from 'next/link';
import { assetUrl } from '@/lib/api';
import type { SiteSlide } from '@/lib/site-api';

interface HeroSliderProps {
  slides: SiteSlide[];
}

export function HeroSlider({ slides }: HeroSliderProps) {
  const items = slides.length
    ? slides
    : [
        {
          id: 'default',
          title: 'Welcome',
          subtitle: 'True Worship · True Witness',
          sortOrder: 0,
          ctaLabel: 'Contact Us',
          ctaUrl: '/contact',
        },
      ];

  const primary = items[0];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white">
      {primary.imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${assetUrl(primary.imageUrl)})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-900/90 via-brand-800/70 to-transparent" />

      <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-4 py-20 sm:px-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
          Power And Glory Generation
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
          {primary.title}
        </h1>
        {primary.subtitle && (
          <p className="mt-5 max-w-2xl text-lg text-white/85 sm:text-xl">{primary.subtitle}</p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          {primary.ctaLabel && primary.ctaUrl && (
            <Link
              href={primary.ctaUrl}
              className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-brand-900 shadow-lg transition hover:bg-gold-light"
            >
              {primary.ctaLabel}
            </Link>
          )}
          <Link
            href="/about"
            className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            About Our Church
          </Link>
        </div>

        {items.length > 1 && (
          <div className="mt-12 flex gap-2">
            {items.map((slide, i) => (
              <span
                key={slide.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === 0 ? 'w-8 bg-gold' : 'w-4 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
