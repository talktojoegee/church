import Link from 'next/link';
import { Check, Clock, MapPin, Phone, Mail } from 'lucide-react';
import { assetUrl } from '@/lib/api';
import type { PublicAboutData } from '@/lib/site-api';
import { CmsHtml } from '@/components/public/CmsHtml';

const DEFAULT_BELIEFS = [
  'The Bible is the inspired and authoritative Word of God',
  'Jesus Christ is Lord and Saviour — born of the Virgin Mary, crucified, risen, and coming again',
  'Salvation is by grace through faith in Jesus Christ',
  'The baptism in the Holy Spirit empowers believers for life and ministry',
  'The Church is called to worship God, witness to the world, and serve our community',
];

export function AboutPageContent({ data }: { data: PublicAboutData }) {
  const { pastor, assistantPastor, founded, story, beliefs, values, sections, church } = data;
  const beliefList = beliefs.length ? beliefs : DEFAULT_BELIEFS;

  const pastorInitials = pastor.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Senior Pastor */}
      {pastor.name && (
        <section className="border-b border-slate-200 bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-5 lg:items-start">
              <div className="lg:col-span-2">
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                  {pastor.photoUrl ? (
                    <img
                      src={assetUrl(pastor.photoUrl)}
                      alt={pastor.name}
                      className="aspect-[3/4] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600">
                      <span className="text-6xl font-bold text-white/90">{pastorInitials}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="lg:col-span-3">
                <p className="text-sm font-semibold uppercase tracking-widest text-flame">
                  Leadership
                </p>
                <h2 className="mt-2 text-3xl font-bold text-brand-900">{pastor.name}</h2>
                <p className="mt-1 text-lg font-medium text-brand-700">{pastor.title}</p>
                {pastor.bio ? (
                  <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                    {pastor.bio.split('\n\n').map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 text-base leading-relaxed text-slate-600">
                    Our senior pastor leads with a heart for worship, discipleship, and community
                    impact. Bio details can be updated from the Website admin panel.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Our Story */}
      <section className="bg-slate-50 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-flame">Our Story</p>
            {founded && (
              <p className="mt-2 text-sm font-medium text-brand-700">Founded {founded}</p>
            )}
            <h2 className="mt-3 text-2xl font-bold text-brand-900 sm:text-3xl">
              Who we are at {church.name}
            </h2>
            {story ? (
              <div className="prose prose-slate mt-6 max-w-none">
                <CmsHtml html={story} />
              </div>
            ) : (
              <p className="mt-6 text-base leading-relaxed text-slate-600">
                {church.name} is a Pentecostal ministry committed to authentic worship, biblical
                teaching, and Spirit-empowered living. We are a family — diverse, welcoming, and
                passionate about seeing lives transformed by the power of God.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* What We Believe */}
      <section className="border-y border-slate-200 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-flame">Faith</p>
          <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">What We Believe</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {beliefList.map((belief) => (
              <li key={belief} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
                <Check size={18} className="mt-0.5 shrink-0 text-flame" />
                <span className="text-sm leading-relaxed text-slate-700">{belief}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Core Values */}
      {values.length > 0 && (
        <section className="bg-slate-50 py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-flame">Culture</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">Our Values</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {values.map((value) => (
                <div
                  key={value}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700"
                >
                  {value}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Assistant Pastor */}
      {assistantPastor && (
        <section className="border-t border-slate-200 bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {assistantPastor.photoUrl ? (
                <img
                  src={assetUrl(assistantPastor.photoUrl)}
                  alt={assistantPastor.name}
                  className="h-32 w-32 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-brand-700 text-2xl font-bold text-white">
                  {assistantPastor.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-flame">
                  {assistantPastor.title}
                </p>
                <h3 className="mt-1 text-xl font-bold text-brand-900">{assistantPastor.name}</h3>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CMS sections */}
      {sections.length > 0 && (
        <section className="bg-slate-50 py-14 sm:py-16">
          <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6">
            {sections.map((section) => (
              <article key={section.id} className="rounded-xl border border-slate-200 bg-white p-8">
                <h3 className="text-xl font-bold text-brand-900">{section.title}</h3>
                {section.subtitle && (
                  <p className="mt-2 text-slate-600">{section.subtitle}</p>
                )}
                {section.body && (
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">{section.body}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Visit CTA */}
      <section className="bg-brand-900 py-14 text-white sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Join us this week</h2>
              <p className="mt-3 text-white/80">
                {church.tagline || 'True Worship · True Witness · 5G'}
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {church.serviceTimes && (
                  <li className="flex gap-3 text-white/85">
                    <Clock size={18} className="mt-0.5 shrink-0 text-gold" />
                    {church.serviceTimes}
                  </li>
                )}
                {church.address && (
                  <li className="flex gap-3 text-white/85">
                    <MapPin size={18} className="mt-0.5 shrink-0 text-gold" />
                    {church.address}
                  </li>
                )}
                {church.phone && (
                  <li className="flex gap-3 text-white/85">
                    <Phone size={18} className="mt-0.5 shrink-0 text-gold" />
                    <a href={`tel:${church.phone}`} className="hover:text-white">
                      {church.phone}
                    </a>
                  </li>
                )}
                {church.email && (
                  <li className="flex gap-3 text-white/85">
                    <Mail size={18} className="mt-0.5 shrink-0 text-gold" />
                    <a href={`mailto:${church.email}`} className="hover:text-white">
                      {church.email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link
                href="/contact"
                className="rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-brand-900 hover:bg-gold-light"
              >
                Plan Your Visit
              </Link>
              <Link
                href="/upcoming-events"
                className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold hover:bg-white/10"
              >
                Upcoming Events
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
