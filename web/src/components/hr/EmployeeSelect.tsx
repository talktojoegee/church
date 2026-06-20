'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber?: string;
  position?: string;
  status?: string;
};

export function EmployeeSelect({
  branchId,
  value,
  onChange,
  label,
  placeholder = 'Select employee…',
}: {
  branchId?: string;
  value: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const employeesQuery = useQuery({
    queryKey: ['employees-select', { branchId, search }],
    queryFn: async () => {
      const data = (await api.get('/hr/employees', {
        params: { branchId, search: search.trim() || undefined },
      })).data as EmployeeOption[];
      return data.filter((e) => e.status !== 'TERMINATED');
    },
    enabled: !!branchId,
  });

  const selectedQuery = useQuery({
    queryKey: ['employee', value],
    queryFn: async () => (await api.get(`/hr/employees/${value}`)).data as EmployeeOption,
    enabled: !!value,
  });

  const selected =
    employeesQuery.data?.find((e) => e.id === value) ?? (selectedQuery.data?.id === value ? selectedQuery.data : null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const formatEmployee = (e: EmployeeOption) => {
    const name = `${e.firstName} ${e.lastName}`;
    return e.employeeNumber ? `${name} (${e.employeeNumber})` : name;
  };

  return (
    <div ref={ref} className="relative">
      {label && <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 hover:border-slate-300"
      >
        <span className={cn('truncate', !selected && 'text-slate-400')}>
          {selected ? formatEmployee(selected) : placeholder}
        </span>
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-100 p-2">
            <Search size={14} className="absolute left-4 top-4 text-slate-400" />
            <input
              className="w-full rounded-md bg-slate-50 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Search by name, ID, position…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="max-h-56 overflow-y-auto p-1">
            {!branchId && (
              <li className="px-3 py-2 text-sm text-slate-400">Select a branch first.</li>
            )}
            {branchId && employeesQuery.isLoading && (
              <li className="px-3 py-2 text-sm text-slate-400">Loading…</li>
            )}
            {branchId &&
              !employeesQuery.isLoading &&
              employeesQuery.data?.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-400">No employees found.</li>
              )}
            {employeesQuery.data?.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-50',
                    value === e.id && 'bg-brand-50 font-medium text-brand-700',
                  )}
                  onClick={() => {
                    onChange(e.id);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <span className="truncate">{formatEmployee(e)}</span>
                  {e.position && (
                    <span className="ml-auto shrink-0 text-xs text-slate-400">{e.position}</span>
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
