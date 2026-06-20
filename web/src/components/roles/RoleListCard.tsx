'use client';

import { Lock, Shield, Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

const GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-700',
] as const;

export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissionKeys: string[];
}

export function RoleListCard({
  role,
  index,
  onClick,
}: {
  role: RoleListItem;
  index: number;
  onClick?: () => void;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];

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
          <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
            <Shield size={20} />
          </div>
          {role.isSystem && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              <Lock size={10} /> System
            </span>
          )}
        </div>

        <h3 className="mt-3 truncate text-lg font-semibold">{role.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-white/75">
          {role.description || 'No description'}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white/15 px-2 py-2 backdrop-blur-sm">
            <Users size={14} className="mx-auto mb-1 opacity-80" />
            <p className="font-bold tabular-nums">{role.userCount}</p>
            <p className="text-white/70">Users</p>
          </div>
          <div className="rounded-lg bg-white/15 px-2 py-2 backdrop-blur-sm">
            <Shield size={14} className="mx-auto mb-1 opacity-80" />
            <p className="font-bold tabular-nums">{role.permissionKeys.length}</p>
            <p className="text-white/70">Permissions</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-1 text-sm font-medium text-white/90">
          Manage role
          <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
        </div>
      </div>
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
    </button>
  );
}

export const MODULE_STYLES: Record<string, { header: string; chip: string; chipActive: string }> = {
  org: { header: 'text-violet-700 bg-violet-50 border-violet-200', chip: 'bg-violet-50 text-violet-700 border-violet-200', chipActive: 'bg-violet-600 text-white border-violet-600' },
  system: { header: 'text-slate-700 bg-slate-100 border-slate-200', chip: 'bg-slate-50 text-slate-700 border-slate-200', chipActive: 'bg-slate-700 text-white border-slate-700' },
  access: { header: 'text-indigo-700 bg-indigo-50 border-indigo-200', chip: 'bg-indigo-50 text-indigo-700 border-indigo-200', chipActive: 'bg-indigo-600 text-white border-indigo-600' },
  membership: { header: 'text-emerald-700 bg-emerald-50 border-emerald-200', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', chipActive: 'bg-emerald-600 text-white border-emerald-600' },
  engagement: { header: 'text-sky-700 bg-sky-50 border-sky-200', chip: 'bg-sky-50 text-sky-700 border-sky-200', chipActive: 'bg-sky-600 text-white border-sky-600' },
  content: { header: 'text-amber-700 bg-amber-50 border-amber-200', chip: 'bg-amber-50 text-amber-700 border-amber-200', chipActive: 'bg-amber-600 text-white border-amber-600' },
  comms: { header: 'text-rose-700 bg-rose-50 border-rose-200', chip: 'bg-rose-50 text-rose-700 border-rose-200', chipActive: 'bg-rose-600 text-white border-rose-600' },
  finance: { header: 'text-teal-700 bg-teal-50 border-teal-200', chip: 'bg-teal-50 text-teal-700 border-teal-200', chipActive: 'bg-teal-600 text-white border-teal-600' },
  hr: { header: 'text-blue-700 bg-blue-50 border-blue-200', chip: 'bg-blue-50 text-blue-700 border-blue-200', chipActive: 'bg-blue-600 text-white border-blue-600' },
  payroll: { header: 'text-purple-700 bg-purple-50 border-purple-200', chip: 'bg-purple-50 text-purple-700 border-purple-200', chipActive: 'bg-purple-600 text-white border-purple-600' },
  reports: { header: 'text-orange-700 bg-orange-50 border-orange-200', chip: 'bg-orange-50 text-orange-700 border-orange-200', chipActive: 'bg-orange-600 text-white border-orange-600' },
};
