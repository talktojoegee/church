'use client';

import { useEffect, useState } from 'react';
import { assetUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

const SIZES = {
  xs: 'h-8 w-8 text-xs',
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-28 w-28 text-3xl',
} as const;

function isUsableAvatarUrl(avatarUrl?: string | null): avatarUrl is string {
  if (!avatarUrl?.trim()) return false;
  const value = avatarUrl.trim();
  return value !== 'null' && value !== 'undefined';
}

export function UserAvatar({
  avatarUrl,
  firstName,
  lastName,
  size = 'sm',
  className,
}: {
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [avatarUrl]);

  const cls = SIZES[size];
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const showPhoto = isUsableAvatarUrl(avatarUrl) && !imgFailed;

  if (showPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={assetUrl(avatarUrl)}
        alt={`${firstName} ${lastName}`.trim() || 'Profile'}
        onError={() => setImgFailed(true)}
        className={cn('rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-800', cls, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 font-semibold text-white shadow-sm',
        cls,
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
