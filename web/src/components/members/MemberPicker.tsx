'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { humanize } from '@/lib/constants';

interface PickMember {
  id: string;
  firstName: string;
  lastName: string;
  membershipNumber: string | null;
  phone?: string | null;
  status?: string;
}

export function MemberPicker({
  branchId,
  type,
  selected,
  onChange,
  excludeIds = [],
}: {
  branchId?: string;
  type?: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  excludeIds?: string[];
}) {
  const [search, setSearch] = useState('');

  const membersQuery = useQuery({
    queryKey: ['member-picker', branchId, type],
    queryFn: async () => {
      if (!branchId) return [] as PickMember[];
      if (type) {
        return (
          await api.get('/follow-ups/campaigns/candidates', {
            params: { branchId, type },
          })
        ).data as PickMember[];
      }
      const res = await api.get('/members', {
        params: { branchId, page: 1, pageSize: 500 },
      });
      return (res.data?.data ?? res.data ?? []) as PickMember[];
    },
    enabled: !!branchId,
  });

  const filtered = useMemo(() => {
    const excluded = new Set(excludeIds);
    const all = (membersQuery.data ?? []).filter((m) => !excluded.has(m.id));
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter((m) =>
      `${m.firstName} ${m.lastName} ${m.membershipNumber ?? ''} ${m.phone ?? ''}`.toLowerCase().includes(q),
    );
  }, [membersQuery.data, search, excludeIds]);

  const allFilteredIds = filtered.map((m) => m.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.includes(id));

  const toggle = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
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
          Select people ({selected.length} chosen)
        </p>
        <Button type="button" variant="outline" size="sm" onClick={selectAll} disabled={!filtered.length}>
          {allSelected ? 'Deselect all' : 'Select all'}
        </Button>
      </div>
      <div className="relative mb-2">
        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search by name, ID, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
        {membersQuery.isLoading && <p className="p-2 text-sm text-slate-400">Loading list…</p>}
        {!membersQuery.isLoading && !branchId && (
          <p className="p-2 text-sm text-slate-400">Select a branch first.</p>
        )}
        {!membersQuery.isLoading && branchId && type && filtered.length === 0 && (
          <p className="p-2 text-sm text-slate-400">No matching members for this type.</p>
        )}
        {!membersQuery.isLoading && branchId && !type && filtered.length === 0 && (
          <p className="p-2 text-sm text-slate-400">No members found.</p>
        )}
        {filtered.map((m) => (
          <label
            key={m.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50"
          >
            <Checkbox
              checked={selected.includes(m.id)}
              onChange={() => toggle(m.id)}
            />
            <MemberAvatar firstName={m.firstName} lastName={m.lastName} />
            <span className="min-w-0 flex-1">
              <span className="font-medium text-slate-800">
                {m.firstName} {m.lastName}
              </span>
              {m.status && (
                <span className="ml-2 text-xs text-slate-400">{humanize(m.status)}</span>
              )}
            </span>
            <span className="text-xs text-slate-400">{m.membershipNumber ?? m.phone ?? ''}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
