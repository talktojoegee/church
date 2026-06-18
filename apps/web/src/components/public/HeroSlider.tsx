'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { assetUrl } from '@/lib/api';
import type { SiteSlide } from '@/lib/site-api';

interface HeroSliderProps {
  slides: SiteSlide[];
  churchName?: string;
}

const DEFAULT_SLIDES: SiteSlide[] = [
  {
    id: 'default',
    title: 'Welcome Home',
    subtitle: 'True Worship · True Witness',
    sortOrder: 0,
    ctaLabel: 'Plan Your Visit',
    ctaUrl: '/contact',
  },
];

export function HeroSlider({ slides, churchName }: HeroSliderProps) {
  const items = slides.length ? slides : DEFAULT_SLIDES;
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [items.length, next]);

  const slide = items[index];

  return (
    <section className="relative min-h-[75vh] overflow-hidden bg-brand-900 text-white">
      {/* Background layers with crossfade */}
      {items.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={i !== index}
        >
          {s.imageUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${assetUrl(s.imageUrl)})` }}
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${
                i % 3 === 0
                  ? 'from-brand-900 via-brand-700 to-flame-orange/80'
                  : i % 3 === 1
                    ? 'from-brand-800 via-brand-600 to-gold/40'
                    : 'from-brand-900 via-flame/70 to-brand-700'
              }`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900/92 via-brand-800/75 to-brand-700/40" />
        </div>
      ))}

      <div className="relative mx-auto flex min-h-[75vh] max-w-6xl flex-col justify-center px-4 py-20 sm:px-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-gold">
          {churchName || 'Power And Glory Generation'}
        </p>

        <div key={slide.id} className="transition-opacity duration-700">
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className="mt-5 max-w-2xl text-lg text-white/90 sm:text-xl">{slide.subtitle}</p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            {slide.ctaLabel && slide.ctaUrl && (
              <Link
                href={slide.ctaUrl}
                className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-brand-900 shadow-lg shadow-gold/30 transition hover:bg-gold-light hover:scale-105"
              >
                {slide.ctaLabel}
              </Link>
            )}
            <Link
              href="/upcoming-events"
              className="rounded-full border-2 border-white/50 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Upcoming Events
            </Link>
          </div>
        </div>

        {items.length > 1 && (
          <div className="mt-12 flex items-center gap-4">
            <button
              type="button"
              onClick={prev}
              className="rounded-full border border-white/30 p-2 text-white transition hover:bg-white/15"
              aria-label="Previous slide"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex gap-2">
              {items.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? 'w-8 bg-gold' : 'w-2 bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              className="rounded-full border border-white/30 p-2 text-white transition hover:bg-white/15"
              aria-label="Next slide"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
