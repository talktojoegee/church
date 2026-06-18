import Link from 'next/link';
import type { SiteSection } from '@/lib/site-api';
import { assetUrl } from '@/lib/api';

interface HomeSectionsProps {
  sections: SiteSection[];
}

export function HomeSections({ sections }: HomeSectionsProps) {
  if (!sections.length) return null;

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.id}
              className={`group rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:shadow-md ${
                section.type === 'CTA' ? 'md:col-span-2 bg-gradient-to-br from-brand-900 to-brand-700 text-white border-0' : ''
              }`}
            >
              {section.imageUrl && (
                <img
                  src={assetUrl(section.imageUrl)}
                  alt=""
                  className="mb-4 h-40 w-full rounded-xl object-cover"
                />
              )}
              <p className={`text-xs font-semibold uppercase tracking-wider ${
                section.type === 'CTA' ? 'text-gold' : 'text-brand-600'
              }`}>
                {section.type.replace('_', ' ')}
              </p>
              <h3 className={`mt-2 text-xl font-bold ${
                section.type === 'CTA' ? 'text-white' : 'text-slate-900'
              }`}>
                {section.title}
              </h3>
              {section.subtitle && (
                <p className={`mt-2 text-sm ${
                  section.type === 'CTA' ? 'text-white/80' : 'text-slate-600'
                }`}>
                  {section.subtitle}
                </p>
              )}
              {section.body && (
                <p className={`mt-3 text-sm leading-relaxed ${
                  section.type === 'CTA' ? 'text-white/85' : 'text-slate-600'
                }`}>
                  {section.body}
                </p>
              )}
              {section.ctaLabel && section.ctaUrl && (
                <Link
                  href={section.ctaUrl}
                  className={`mt-4 inline-flex text-sm font-semibold ${
                    section.type === 'CTA'
                      ? 'rounded-full bg-gold px-5 py-2 text-brand-900'
                      : 'text-brand-700 hover:text-brand-900'
                  }`}
                >
                  {section.ctaLabel} →
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
