'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, Users, MapPin, Clock, Layers, Crown, Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranches } from '@/lib/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

interface Group {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  location: string | null;
  branch: { id: string; name: string };
  leader: { id: string; firstName: string; lastName: string } | null;
  _count: { members: number };
}

const empty = {
  name: '',
  branchId: '',
  category: 'Cell',
  description: '',
  meetingDay: '',
  meetingTime: '',
  location: '',
};

const CARD_GRADIENTS = [
  'from-emerald-500 to-teal-700',
  'from-sky-500 to-blue-700',
  'from-violet-500 to-purple-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-700',
  'from-indigo-500 to-blue-800',
];

export default function GroupsPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState(empty);

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data as Group[],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { branchId, ...rest } = form;
        return api.patch(`/groups/${editing.id}`, rest);
      }
      return api.post('/groups', form);
    },
    meta: {
      successMessage: editing ? 'Group updated' : 'Group created',
      errorMessage: 'Failed to save group',
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      setOpen(false);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });

  const openCreate = () => {
    setEditing(null);
    const main = branches.data?.find((b) => b.isMain) ?? branches.data?.[0];
    setForm({ ...empty, branchId: main?.id ?? '' });
    setOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditing(g);
    setForm({
      name: g.name,
      branchId: g.branch.id,
      category: g.category ?? '',
      description: g.description ?? '',
      meetingDay: g.meetingDay ?? '',
      meetingTime: g.meetingTime ?? '',
      location: g.location ?? '',
    });
    setOpen(true);
  };

  const handleDelete = (g: Group) => {
    const count = g._count?.members ?? 0;
    const msg = count
      ? `Delete "${g.name}"? ${count} member(s) will be removed from this group.`
      : `Delete "${g.name}"?`;
    if (confirm(msg)) del.mutate(g.id);
  };

  const list = groupsQuery.data ?? [];
  const showBranch = (branches.data?.length ?? 0) > 1;

  const stats = useMemo(() => {
    const totalMembers = list.reduce((sum, g) => sum + (g._count?.members ?? 0), 0);
    const withLeader = list.filter((g) => g.leader).length;
    const categories = new Set(list.map((g) => g.category).filter(Boolean)).size;
    const branchCount = new Set(list.map((g) => g.branch?.id).filter(Boolean)).size;
    return { totalMembers, withLeader, categories, branchCount };
  }, [list]);

  return (
    <div>
      <PageHeader
        title="Groups"
        description="Cells, fellowships and small groups."
        action={
          hasPermission('membership.group.create') && (
            <Button onClick={openCreate}>
              <Plus size={16} /> New Group
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColorStatCard
          label="Total groups"
          value={groupsQuery.isLoading ? '—' : list.length}
          icon={<Layers size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="Members in groups"
          value={groupsQuery.isLoading ? '—' : stats.totalMembers}
          hint="Across all groups"
          icon={<Users size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="With leader"
          value={groupsQuery.isLoading ? '—' : stats.withLeader}
          hint={list.length ? `${list.length - stats.withLeader} without a leader` : undefined}
          icon={<Crown size={22} />}
          color="amber"
        />
        <ColorStatCard
          label={showBranch ? 'Branches covered' : 'Group types'}
          value={groupsQuery.isLoading ? '—' : showBranch ? stats.branchCount : stats.categories}
          icon={<Building2 size={22} />}
          color="violet"
        />
      </div>

      {groupsQuery.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!groupsQuery.isLoading && list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <Users className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={40} />
          <p className="text-sm text-slate-500 dark:text-slate-400">No groups yet.</p>
          {hasPermission('membership.group.create') && (
            <Button className="mt-4" onClick={openCreate}>
              <Plus size={16} /> Create first group
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((g, i) => {
          const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
          return (
            <article
              key={g.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500/40"
            >
              <div className={cn('relative bg-gradient-to-br px-5 py-4 text-white', gradient)}>
                <div className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/10" />
                <div className="relative flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold">{g.name}</h3>
                  {g.category && (
                    <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                      {g.category}
                    </span>
                  )}
                </div>
                {g.description && (
                  <p className="relative mt-1 line-clamp-2 text-sm text-white/85">{g.description}</p>
                )}
                {showBranch && (
                  <p className="relative mt-2 flex items-center gap-1 text-xs text-white/75">
                    <Building2 size={12} /> {g.branch.name}
                  </p>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  {(g.meetingDay || g.meetingTime) && (
                    <p className="flex items-center gap-2">
                      <Clock size={14} className="text-brand-600 dark:text-brand-400" />
                      {[g.meetingDay, g.meetingTime].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {g.location && (
                    <p className="flex items-center gap-2">
                      <MapPin size={14} className="text-brand-600 dark:text-brand-400" />
                      {g.location}
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Users size={14} className="text-brand-600 dark:text-brand-400" />
                    {g._count.members} member{g._count.members === 1 ? '' : 's'}
                    {g.leader && (
                      <span className="text-slate-400">
                        · Lead: {g.leader.firstName} {g.leader.lastName}
                      </span>
                    )}
                  </p>
                </div>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Link href={`/groups/${g.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye size={14} /> View details
                    </Button>
                  </Link>
                  {hasPermission('membership.group.update') && (
                    <button
                      type="button"
                      onClick={() => openEdit(g)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {hasPermission('membership.group.delete') && (
                    <button
                      type="button"
                      onClick={() => handleDelete(g)}
                      className="rounded-lg border border-rose-100 p-2 text-rose-500 transition hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/40"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Group' : 'New Group'} size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Cell, Fellowship…" />
            {!editing && (branches.data?.length ?? 0) > 1 && (
              <Select label="Branch" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required>
                {branches.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
            <Input label="Meeting day" value={form.meetingDay} onChange={(e) => setForm({ ...form, meetingDay: e.target.value })} placeholder="Wednesday" />
            <Input label="Meeting time" value={form.meetingTime} onChange={(e) => setForm({ ...form, meetingTime: e.target.value })} placeholder="18:00" />
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Save changes' : 'Create group'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
