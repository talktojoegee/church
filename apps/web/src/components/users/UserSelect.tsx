'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export type UserOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  isActive?: boolean;
  roles?: { name: string }[];
};

export function UserSelect({
  value,
  onChange,
  label,
  placeholder = 'Link system user (optional)…',
  excludeLinked = true,
  exceptEmployeeId,
}: {
  value: string;
  onChange: (userId: string, user?: UserOption | null) => void;
  label?: string;
  placeholder?: string;
  /** Hide users already linked to another employee record. */
  excludeLinked?: boolean;
  /** When editing, keep this employee's linked user selectable. */
  exceptEmployeeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const usersQuery = useQuery({
    queryKey: ['users-select', search],
    queryFn: async () => {
      const res = await api.get('/users', {
        params: { pageSize: 100, search: search.trim() || undefined },
      });
      return (res.data?.data ?? res.data ?? []) as UserOption[];
    },
  });

  const linkedQuery = useQuery({
    queryKey: ['employees-linked-users', exceptEmployeeId],
    queryFn: async () => {
      const rows = (await api.get('/hr/employees')).data as {
        id: string;
        user?: { id: string } | null;
      }[];
      return new Set(
        rows
          .filter((e) => e.id !== exceptEmployeeId)
          .map((e) => e.user?.id)
          .filter(Boolean) as string[],
      );
    },
    enabled: excludeLinked,
  });

  const selectedQuery = useQuery({
    queryKey: ['user', value],
    queryFn: async () => (await api.get(`/users/${value}`)).data as UserOption,
    enabled: !!value,
  });

  const linkedIds = linkedQuery.data ?? new Set<string>();
  const options = (usersQuery.data ?? []).filter((u) => {
    if (!excludeLinked) return true;
    if (u.id === value) return true;
    return !linkedIds.has(u.id);
  });

  const selected =
    options.find((u) => u.id === value) ??
    (selectedQuery.data?.id === value ? selectedQuery.data : null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const formatUser = (u: UserOption) => `${u.firstName} ${u.lastName} · ${u.email}`;

  return (
    <div ref={ref} className="relative">
      {label && <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 hover:border-slate-300"
        >
          <span className={cn('truncate', !selected && 'text-slate-400')}>
            {selected ? formatUser(selected) : placeholder}
          </span>
          <ChevronDown size={16} className="shrink-0 text-slate-400" />
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('', null)}
            className="rounded-lg border border-slate-200 px-2.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            title="Unlink user"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Links this employee to a login account for payroll and HR self-service.
      </p>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-100 p-2">
            <Search size={14} className="absolute left-4 top-4 text-slate-400" />
            <input
              className="w-full rounded-md bg-slate-50 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="max-h-56 overflow-y-auto p-1">
            {usersQuery.isLoading && <li className="px-3 py-2 text-sm text-slate-400">Loading…</li>}
            {!usersQuery.isLoading && options.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">No users available to link.</li>
            )}
            {options.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full flex-col rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50',
                    value === u.id && 'bg-brand-50 font-medium text-brand-700',
                  )}
                  onClick={() => {
                    onChange(u.id, u);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <span className="font-medium">
                    {u.firstName} {u.lastName}
                  </span>
                  <span className="text-xs text-slate-500">{u.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
