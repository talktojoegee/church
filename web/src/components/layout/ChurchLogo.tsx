'use client';

import { assetUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ChurchLogoProps {
  name?: string;
  logoUrl?: string | null;
  /** sidebar = compact navbar slot; login = larger hero; preview = settings preview */
  variant?: 'sidebar' | 'login' | 'preview';
  showName?: boolean;
  className?: string;
}

export function ChurchLogo({
  name,
  logoUrl,
  variant = 'sidebar',
  showName = true,
  className,
}: ChurchLogoProps) {
  const displayName = name || 'Power & Glory Generation';
  const src = logoUrl ? assetUrl(logoUrl) : '/logo.png';
  const usesDefaultLogo = !logoUrl;

  const logoDims =
    variant === 'login'
      ? 'h-16 max-w-[240px]'
      : variant === 'preview'
        ? 'h-10 max-w-[160px]'
        : 'h-9 max-w-[140px]';

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${displayName} logo`}
      className={cn(logoDims, 'w-auto shrink-0 object-contain object-left')}
    />
  );

  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {variant === 'login' && usesDefaultLogo ? (
        <div className="rounded-xl bg-brand-900 px-4 py-3">{image}</div>
      ) : (
        image
      )}
      {showName && usesDefaultLogo && variant === 'login' && (
        <span className="truncate text-xl font-semibold text-brand-900">{displayName}</span>
      )}
      {showName && !usesDefaultLogo && variant !== 'sidebar' && (
        <span
          className={cn(
            'truncate font-semibold',
            variant === 'login' ? 'text-xl text-brand-900' : 'text-white',
          )}
        >
          {displayName}
        </span>
      )}
    </div>
  );
}
