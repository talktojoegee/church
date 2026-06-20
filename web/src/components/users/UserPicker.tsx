'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';

interface PickUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  roles?: { role: { name: string } }[];
}

export function UserPicker({
  branchId,
  selected,
  onChange,
}: {
  branchId?: string;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');

  const usersQuery = useQuery({
    queryKey: ['follow-up-assignees', branchId],
    queryFn: async () => {
      if (!branchId) return [] as PickUser[];
      return (await api.get('/follow-ups/campaigns/assignees', { params: { branchId } })).data as PickUser[];
    },
    enabled: !!branchId,
  });

  const filtered = useMemo(() => {
    const all = usersQuery.data ?? [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter((u) =>
      `${u.firstName} ${u.lastName} ${u.email} ${u.phone ?? ''}`.toLowerCase().includes(q),
    );
  }, [usersQuery.data, search]);

  const allFilteredIds = filtered.map((u) => u.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.includes(id));

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const selectAll = () => {
    if (allSelected) {
      onChange(selected.filter((id) => !allFilteredIds.includes(id)));
    } else {
      onChange([...new Set([...selected, ...allFilteredIds])]);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">
          Responsible persons ({selected.length} selected)
        </p>
        <Button type="button" variant="outline" size="sm" onClick={selectAll} disabled={!filtered.length}>
          {allSelected ? 'Deselect all' : 'Select all'}
        </Button>
      </div>
      <div className="relative mb-2">
        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search by name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
        {usersQuery.isLoading && <p className="p-2 text-sm text-slate-400">Loading staff…</p>}
        {!usersQuery.isLoading && !branchId && (
          <p className="p-2 text-sm text-slate-400">Select a branch first.</p>
        )}
        {!usersQuery.isLoading && branchId && filtered.length === 0 && (
          <p className="p-2 text-sm text-slate-400">No staff users found for this branch.</p>
        )}
        {filtered.map((u) => (
          <label
            key={u.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50"
          >
            <Checkbox checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {u.firstName[0]}
              {u.lastName[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-medium text-slate-800">
                {u.firstName} {u.lastName}
              </span>
              {u.roles?.length ? (
                <span className="ml-2 text-xs text-slate-400">
                  {u.roles.map((r) => r.role.name).join(', ')}
                </span>
              ) : null}
              <span className="block truncate text-xs text-slate-400">{u.email}</span>
            </span>
            {u.phone && <span className="text-xs text-slate-400">{u.phone}</span>}
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Selected staff will receive SMS and email with campaign details when you create the campaign.
      </p>
    </div>
  );
}
