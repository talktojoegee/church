'use client';

import { useEffect, useState } from 'react';
import { assetUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-16 w-16 text-xl',
  lg: 'h-24 w-24 text-3xl',
  xl: 'h-32 w-32 text-4xl ring-4 ring-white/30',
} as const;

const GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-sky-500 to-blue-700',
  'from-emerald-500 to-teal-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-600',
  'from-indigo-500 to-blue-800',
  'from-fuchsia-500 to-purple-800',
  'from-cyan-500 to-sky-700',
];

function gradientFor(firstName: string, lastName: string): string {
  const key = `${firstName}${lastName}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function isUsablePhotoUrl(photoUrl?: string | null): photoUrl is string {
  if (!photoUrl?.trim()) return false;
  const p = photoUrl.trim();
  if (p === 'null' || p === 'undefined') return false;
  return true;
}

export function MemberAvatar({
  photoUrl,
  firstName,
  lastName,
  size = 'sm',
  className,
}: {
  photoUrl?: string | null;
  firstName: string;
  lastName: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [photoUrl]);

  const cls = SIZES[size];
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  const gradient = gradientFor(firstName, lastName);
  const showPhoto = isUsablePhotoUrl(photoUrl) && !imgFailed;

  if (showPhoto) {
    return (
      <img
        src={assetUrl(photoUrl)}
        alt={`${firstName} ${lastName}`}
        onError={() => setImgFailed(true)}
        className={cn('rounded-full object-cover shadow-md', cls, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-md',
        gradient,
        cls,
        className,
      )}
      aria-hidden
    >
      {initials || '?'}
    </span>
  );
}

/** Hero banner gradient matched to member avatar palette. */
export function memberHeroGradient(firstName: string, lastName: string): string {
  const g = gradientFor(firstName, lastName);
  return `bg-gradient-to-br ${g}`;
}
