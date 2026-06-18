import Link from 'next/link';
import type { SiteSection } from '@/lib/site-api';
import { assetUrl } from '@/lib/api';

interface HomeSectionsProps {
  sections: SiteSection[];
}

export function HomeSections({ sections }: HomeSectionsProps) {
  if (!sections.length) return null;

  const welcome = sections.find((s) => s.type === 'WELCOME');
  const vision = sections.find((s) => s.type === 'VISION');
  const mission = sections.find((s) => s.type === 'MISSION');
  const cta = sections.find((s) => s.type === 'CTA');
  const others = sections.filter(
    (s) => !['WELCOME', 'VISION', 'MISSION', 'CTA'].includes(s.type),
  );

  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {welcome && (
          <div className="mb-16 grid gap-10 lg:grid-cols-2 lg:items-center">
            {welcome.imageUrl && (
              <img
                src={assetUrl(welcome.imageUrl)}
                alt=""
                className="aspect-[4/3] w-full rounded-2xl object-cover shadow-md"
              />
            )}
            <div className={welcome.imageUrl ? '' : 'lg:col-span-2 max-w-3xl'}>
              <SectionBlock section={welcome} />
            </div>
          </div>
        )}

        {(vision || mission) && (
          <div className="mb-16 grid gap-6 md:grid-cols-2">
            {vision && (
              <article className="rounded-xl border border-slate-200 bg-white p-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                  Vision
                </p>
                <SectionBlock section={vision} compact />
              </article>
            )}
            {mission && (
              <article className="rounded-xl border border-slate-200 bg-white p-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                  Mission
                </p>
                <SectionBlock section={mission} compact />
              </article>
            )}
          </div>
        )}

        {others.length > 0 && (
          <div className="mb-16 space-y-8">
            {others.map((section) => (
              <article
                key={section.id}
                className="rounded-xl border border-slate-200 bg-white p-8"
              >
                <SectionBlock section={section} />
              </article>
            ))}
          </div>
        )}

        {cta && (
          <article className="rounded-2xl bg-brand-900 px-8 py-10 text-white sm:px-10">
            <SectionBlock section={cta} inverted />
          </article>
        )}
      </div>
    </section>
  );
}

function SectionBlock({
  section,
  inverted,
  compact,
}: {
  section: SiteSection;
  inverted?: boolean;
  compact?: boolean;
}) {
  return (
    <>
      <h3
        className={`font-bold text-brand-900 ${compact ? 'mt-2 text-xl' : 'text-2xl sm:text-3xl'} ${inverted ? '!text-white' : ''}`}
      >
        {section.title}
      </h3>
      {section.subtitle && (
        <p className={`mt-2 ${compact ? 'text-sm' : 'text-base'} ${inverted ? 'text-white/85' : 'text-slate-600'}`}>
          {section.subtitle}
        </p>
      )}
      {section.body && (
        <p
          className={`mt-3 leading-relaxed ${compact ? 'text-sm' : 'text-base'} ${inverted ? 'text-white/90' : 'text-slate-600'}`}
        >
          {section.body}
        </p>
      )}
      {section.ctaLabel && section.ctaUrl && (
        <Link
          href={section.ctaUrl}
          className={`mt-5 inline-flex rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
            inverted
              ? 'bg-gold text-brand-900 hover:bg-gold-light'
              : 'bg-brand-700 text-white hover:bg-brand-800'
          }`}
        >
          {section.ctaLabel} →
        </Link>
      )}
    </>
  );
}
