import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { ChurchLogo } from '@/components/layout/ChurchLogo';

interface PublicFooterProps {
  name?: string;
  logoUrl?: string | null;
  tagline?: string;
  email?: string;
  phone?: string;
  address?: string;
  serviceTimes?: string;
}

export function PublicFooter({
  name,
  logoUrl,
  tagline,
  email,
  phone,
  address,
  serviceTimes,
}: PublicFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-900 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <ChurchLogo name={name} logoUrl={logoUrl} variant="sidebar" showName={false} />
          {tagline && <p className="mt-3 text-sm text-white/70">{tagline}</p>}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
            Service Times
          </h3>
          <p className="text-sm leading-relaxed text-white/80 whitespace-pre-line">
            {serviceTimes || 'Sunday Worship · Midweek Bible Study'}
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
            Contact
          </h3>
          <ul className="space-y-2 text-sm text-white/80">
            {address && (
              <li className="flex gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-gold" />
                <span>{address}</span>
              </li>
            )}
            {phone && (
              <li className="flex gap-2">
                <Phone size={16} className="mt-0.5 shrink-0 text-gold" />
                <a href={`tel:${phone}`} className="hover:text-white">
                  {phone}
                </a>
              </li>
            )}
            {email && (
              <li className="flex gap-2">
                <Mail size={16} className="mt-0.5 shrink-0 text-gold" />
                <a href={`mailto:${email}`} className="hover:text-white">
                  {email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-white/60 sm:flex-row sm:px-6">
          <p>© {year} {name}. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-white">
              About
            </Link>
            <Link href="/give" className="hover:text-white">
              Give
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
            <Link href="/login" className="hover:text-white">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
