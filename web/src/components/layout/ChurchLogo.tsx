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
  const displayName = name || 'ChMS';
  const initial = displayName.charAt(0).toUpperCase();

  const logoDims =
    variant === 'login'
      ? 'h-14 max-w-[200px]'
      : variant === 'preview'
        ? 'h-10 max-w-[160px]'
        : 'h-8 max-w-[120px]';

  const fallbackBox =
    variant === 'login' ? 'h-14 w-14 text-xl' : variant === 'preview' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-sm';

  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assetUrl(logoUrl)}
          alt={`${displayName} logo`}
          className={cn(logoDims, 'w-auto shrink-0 object-contain object-left')}
        />
      ) : (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg bg-brand-500 font-bold text-white shadow-lg shadow-brand-500/30',
            fallbackBox,
          )}
        >
          {initial}
        </div>
      )}
      {showName && (
        <span
          className={cn(
            'truncate font-semibold',
            variant === 'login' ? 'text-xl text-slate-900' : 'text-white',
          )}
        >
          {displayName}
        </span>
      )}
    </div>
  );
}
