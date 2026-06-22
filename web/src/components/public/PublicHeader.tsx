'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogIn } from 'lucide-react';
import { useState } from 'react';
import { ChurchLogo } from '@/components/layout/ChurchLogo';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/upcoming-events', label: 'Events' },
  { href: '/stories', label: 'Testimonies' },
  { href: '/our-outreaches', label: 'Outreaches' },
  { href: '/give', label: 'Give' },
  { href: '/contact', label: 'Contact' },
];

interface PublicHeaderProps {
  name?: string;
  logoUrl?: string | null;
}

export function PublicHeader({ name, logoUrl }: PublicHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-900/95 text-white backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <ChurchLogo name={name} logoUrl={logoUrl} variant="sidebar" showName={false} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-white/15 text-gold-light'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/login"
            className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-light"
          >
            <LogIn size={16} />
            Member Login
          </Link>
        </nav>

        <button
          type="button"
          className="rounded-lg p-2 text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-brand-900 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-gold px-3 py-2.5 text-center text-sm font-semibold text-brand-900"
            >
              Member Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
