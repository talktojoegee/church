import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';

interface VisitInviteProps {
  serviceTimes?: string;
  address?: string;
}

export function VisitInvite({ serviceTimes, address }: VisitInviteProps) {
  return (
    <section className="bg-brand-900 py-14 text-white sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Plan your visit</h2>
            <p className="mt-3 text-white/80">
              We would love to welcome you in person. Reach out if you have questions or need
              directions — our team is happy to help.
            </p>
            {(serviceTimes || address) && (
              <ul className="mt-6 space-y-3 text-sm text-white/85">
                {serviceTimes && (
                  <li className="flex gap-3">
                    <Clock size={18} className="mt-0.5 shrink-0 text-gold" />
                    <span>{serviceTimes}</span>
                  </li>
                )}
                {address && (
                  <li className="flex gap-3">
                    <MapPin size={18} className="mt-0.5 shrink-0 text-gold" />
                    <span>{address}</span>
                  </li>
                )}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link
              href="/contact"
              className="rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-brand-900 transition hover:bg-gold-light"
            >
              Contact Us
            </Link>
            <Link
              href="/upcoming-events"
              className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              See Events
            </Link>
            <Link
              href="/give"
              className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Give Online
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
