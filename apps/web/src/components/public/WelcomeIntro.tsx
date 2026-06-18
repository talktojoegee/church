import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { assetUrl } from '@/lib/api';

interface PastorPreview {
  name: string;
  title: string;
  bio: string;
  photoUrl?: string | null;
}

interface WelcomeIntroProps {
  churchName?: string;
  pastor?: PastorPreview | null;
}

export function WelcomeIntro({ churchName, pastor }: WelcomeIntroProps) {
  const initials = pastor?.name
    ? pastor.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'PS';

  return (
    <section className="border-b border-slate-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-flame">
              {churchName || 'Power And Glory Generation'}
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-brand-900 sm:text-4xl">
              A church family built on worship, the Word, and witness
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              We are a Pentecostal ministry committed to authentic worship, biblical teaching, and
              Spirit-empowered living. Our name reflects our calling:{' '}
              <strong className="font-semibold text-brand-900">5G</strong> — five generations
              touched by the gospel, from children to great-grandparents, walking together in
              faith.
            </p>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Whether you are exploring faith for the first time or looking for a church home, you
              are welcome here. Come as you are and experience the presence of God with us.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900"
            >
              Read our full story <ArrowRight size={16} />
            </Link>
          </div>

          {pastor?.name && (
            <aside className="lg:col-span-2">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="aspect-[4/5] bg-brand-100">
                  {pastor.photoUrl ? (
                    <img
                      src={assetUrl(pastor.photoUrl)}
                      alt={pastor.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600">
                      <span className="text-5xl font-bold text-white/90">{initials}</span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-flame">
                    {pastor.title}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-brand-900">{pastor.name}</h3>
                  {pastor.bio && (
                    <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-600">
                      {pastor.bio}
                    </p>
                  )}
                  <Link
                    href="/about"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-900"
                  >
                    Meet our leadership <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
