'use client';

import Link from 'next/link';
import { MapPin, Users, Building2, Layers, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BranchOption } from '@/lib/hooks';

const GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-700',
] as const;

export function BranchListCard({ branch, index }: { branch: BranchOption; index: number }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const location = [branch.city, branch.state].filter(Boolean).join(', ');
  const members = branch._count?.members ?? 0;
  const departments = branch._count?.departments ?? 0;
  const groups = branch._count?.groups ?? 0;

  return (
    <Link
      href={`/branches/${branch.id}`}
      className={cn(
        'group relative block overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg transition',
        'hover:scale-[1.02] hover:shadow-xl',
        gradient,
      )}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
            <span className="text-sm font-bold">{branch.code.slice(0, 3)}</span>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {branch.isMain && (
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Main
              </span>
            )}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                branch.isActive ? 'bg-white/25' : 'bg-black/20',
              )}
            >
              {branch.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <h3 className="mt-3 truncate text-lg font-semibold">{branch.name}</h3>
        <p className="mt-1 flex items-center gap-1 truncate text-sm text-white/75">
          <MapPin size={14} className="shrink-0" />
          {location || 'No location set'}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white/15 px-2 py-2 backdrop-blur-sm">
            <Users size={14} className="mx-auto mb-1 opacity-80" />
            <p className="font-bold tabular-nums">{members}</p>
            <p className="text-white/70">Members</p>
          </div>
          <div className="rounded-lg bg-white/15 px-2 py-2 backdrop-blur-sm">
            <Building2 size={14} className="mx-auto mb-1 opacity-80" />
            <p className="font-bold tabular-nums">{departments}</p>
            <p className="text-white/70">Depts</p>
          </div>
          <div className="rounded-lg bg-white/15 px-2 py-2 backdrop-blur-sm">
            <Layers size={14} className="mx-auto mb-1 opacity-80" />
            <p className="font-bold tabular-nums">{groups}</p>
            <p className="text-white/70">Groups</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-1 text-sm font-medium text-white/90">
          View branch
          <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
        </div>
      </div>
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/5" />
    </Link>
  );
}
