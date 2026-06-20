'use client';

import { Mail, Shield, Clock, Building2, ChevronRight } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

const GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-700',
] as const;

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  lastLoginAt: string | null;
  avatarUrl?: string | null;
  branch?: { id: string; name: string; code: string } | null;
  roles: { id: string; name: string }[];
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function UserListCard({
  user,
  index,
  onClick,
}: {
  user: UserListItem;
  index: number;
  onClick?: () => void;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const name = `${user.firstName} ${user.lastName}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-left text-white shadow-lg transition',
        'hover:scale-[1.02] hover:shadow-xl',
        gradient,
      )}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-sm font-bold backdrop-blur-sm">
            {initials(user.firstName, user.lastName)}
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {user.isSuperAdmin && (
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Super
              </span>
            )}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                user.isActive ? 'bg-white/25' : 'bg-black/20',
              )}
            >
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <h3 className="mt-3 truncate text-lg font-semibold">{name}</h3>
        <p className="mt-1 flex items-center gap-1 truncate text-sm text-white/75">
          <Mail size={14} className="shrink-0" />
          {user.email}
        </p>

        {user.branch && (
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-white/70">
            <Building2 size={12} className="shrink-0" />
            {user.branch.name}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-1">
          {user.roles.length === 0 && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] text-white/80">No roles</span>
          )}
          {user.roles.slice(0, 3).map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-0.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm"
            >
              <Shield size={10} />
              {r.name}
            </span>
          ))}
          {user.roles.length > 3 && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">+{user.roles.length - 3}</span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-white/75">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never logged in'}
          </span>
          <span className="flex items-center gap-1 font-medium text-white/90">
            Manage
            <ChevronRight size={14} className="transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/5" />
    </button>
  );
}
