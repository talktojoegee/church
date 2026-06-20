'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { MemberAvatar } from './MemberAvatar';

export function MemberSelect({
  branchId,
  value,
  onChange,
  label,
  allowAnonymous = true,
}: {
  branchId?: string;
  value: string;
  onChange: (id: string) => void;
  label?: string;
  allowAnonymous?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const membersQuery = useQuery({
    queryKey: ['members', { branchId, search }],
    queryFn: async () =>
      (
        await api.get('/members', {
          params: { branchId, search: search.trim() || undefined, pageSize: 50 },
        })
      ).data.data,
    enabled: !!branchId,
  });

  const selected = membersQuery.data?.find((m: { id: string }) => m.id === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      {label && <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 hover:border-slate-300"
      >
        <span className={cn('truncate', !selected && !value && 'text-slate-400')}>
          {selected
            ? `${selected.firstName} ${selected.lastName}`
            : allowAnonymous
              ? 'Anonymous'
              : 'Select member…'}
        </span>
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-100 p-2">
            <Search size={14} className="absolute left-4 top-4 text-slate-400" />
            <input
              className="w-full rounded-md bg-slate-50 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Search by name, ID, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="max-h-56 overflow-y-auto p-1">
            {allowAnonymous && (
              <li>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center rounded-md px-2 py-2 text-sm hover:bg-slate-50',
                    !value && 'bg-brand-50 font-medium text-brand-700',
                  )}
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  Anonymous
                </button>
              </li>
            )}
            {!branchId && (
              <li className="px-3 py-2 text-sm text-slate-400">Select a branch first.</li>
            )}
            {branchId && membersQuery.isLoading && (
              <li className="px-3 py-2 text-sm text-slate-400">Loading…</li>
            )}
            {branchId &&
              !membersQuery.isLoading &&
              membersQuery.data?.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-400">No members found.</li>
              )}
            {membersQuery.data?.map((m: { id: string; firstName: string; lastName: string; membershipNumber?: string }) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-50',
                    value === m.id && 'bg-brand-50 font-medium text-brand-700',
                  )}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <MemberAvatar firstName={m.firstName} lastName={m.lastName} size="sm" />
                  <span className="truncate">
                    {m.firstName} {m.lastName}
                  </span>
                  {m.membershipNumber && (
                    <span className="ml-auto shrink-0 text-xs text-slate-400">{m.membershipNumber}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
