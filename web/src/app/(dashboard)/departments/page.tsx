'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, Users, Building2, Layers, Crown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranches, useDepartments, type DepartmentOption } from '@/lib/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

interface DepartmentRow extends DepartmentOption {
  hod?: { id: string; firstName: string; lastName: string } | null;
  branch?: { id: string; name: string };
}

const CARD_GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-sky-500 to-blue-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-700',
  'from-indigo-500 to-blue-800',
];

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const departments = useDepartments();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [form, setForm] = useState({ name: '', branchId: '', description: '' });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return api.patch(`/departments/${editing.id}`, {
          name: form.name,
          description: form.description,
        });
      }
      return api.post('/departments', form);
    },
    meta: {
      successMessage: editing ? 'Department updated' : 'Department created',
      errorMessage: 'Failed to save department',
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      setOpen(false);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/departments/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });

  const openCreate = () => {
    setEditing(null);
    const main = branches.data?.find((b) => b.isMain) ?? branches.data?.[0];
    setForm({ name: '', branchId: main?.id ?? '', description: '' });
    setOpen(true);
  };

  const openEdit = (d: DepartmentRow) => {
    setEditing(d);
    setForm({ name: d.name, branchId: d.branch?.id ?? '', description: d.description ?? '' });
    setOpen(true);
  };

  const handleDelete = (d: DepartmentRow) => {
    const count = d._count?.members ?? 0;
    const msg = count
      ? `Delete "${d.name}"? ${count} member(s) will be removed from this department.`
      : `Delete "${d.name}"?`;
    if (confirm(msg)) del.mutate(d.id);
  };

  const list = (departments.data ?? []) as DepartmentRow[];
  const showBranch = (branches.data?.length ?? 0) > 1;

  const stats = useMemo(() => {
    const totalMembers = list.reduce((sum, d) => sum + (d._count?.members ?? 0), 0);
    const withHod = list.filter((d) => d.hod ?? d.leader).length;
    const branchCount = new Set(list.map((d) => d.branch?.id).filter(Boolean)).size;
    const largest = list.reduce((max, d) => Math.max(max, d._count?.members ?? 0), 0);
    return { totalMembers, withHod, branchCount, largest };
  }, [list]);

  return (
    <div>
      <PageHeader
        title="Departments & Ministries"
        description="Organise your church into units, choirs, and ministries."
        action={
          hasPermission('org.department.create') && (
            <Button onClick={openCreate}>
              <Plus size={16} /> New Department
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColorStatCard
          label="Total departments"
          value={departments.isLoading ? '—' : list.length}
          icon={<Layers size={22} />}
          color="violet"
        />
        <ColorStatCard
          label="Members assigned"
          value={departments.isLoading ? '—' : stats.totalMembers}
          hint="Across all departments"
          icon={<Users size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="With HOD"
          value={departments.isLoading ? '—' : stats.withHod}
          hint={list.length ? `${list.length - stats.withHod} without a head` : undefined}
          icon={<Crown size={22} />}
          color="amber"
        />
        <ColorStatCard
          label={showBranch ? 'Branches covered' : 'Largest department'}
          value={
            departments.isLoading
              ? '—'
              : showBranch
                ? stats.branchCount
                : stats.largest
          }
          hint={showBranch ? 'With at least one department' : 'Most members in one unit'}
          icon={<Building2 size={22} />}
          color="rose"
        />
      </div>

      {departments.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!departments.isLoading && list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <Building2 className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={40} />
          <p className="text-sm text-slate-500 dark:text-slate-400">No departments yet.</p>
          {hasPermission('org.department.create') && (
            <Button className="mt-4" onClick={openCreate}>
              <Plus size={16} /> Create first department
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((d, i) => {
          const hod = d.hod ?? d.leader;
          const memberCount = d._count?.members ?? 0;
          const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length];

          return (
            <article
              key={d.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500/40"
            >
              <div className={cn('relative bg-gradient-to-br px-5 py-4 text-white', gradient)}>
                <div className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/10" />
                <h3 className="relative text-lg font-bold">{d.name}</h3>
                {d.description && (
                  <p className="relative mt-1 line-clamp-2 text-sm text-white/85">{d.description}</p>
                )}
                {showBranch && d.branch && (
                  <p className="relative mt-2 flex items-center gap-1 text-xs text-white/75">
                    <Building2 size={12} /> {d.branch.name}
                  </p>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Members</p>
                    <p className="mt-1 flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                      <Users size={14} className="text-brand-600 dark:text-brand-400" />
                      {memberCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">HOD</p>
                    <p className="mt-1 truncate font-semibold text-slate-900 dark:text-slate-100">
                      {hod ? `${hod.firstName} ${hod.lastName}` : '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Link href={`/departments/${d.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye size={14} /> View details
                    </Button>
                  </Link>
                  {hasPermission('org.department.update') && (
                    <button
                      type="button"
                      onClick={() => openEdit(d)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {hasPermission('org.department.delete') && (
                    <button
                      type="button"
                      onClick={() => handleDelete(d)}
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Department' : 'New Department'}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          {!editing && (branches.data?.length ?? 0) > 1 && (
            <Select label="Branch" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required>
              {branches.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
          {!editing && (branches.data?.length ?? 0) <= 1 && branches.data?.[0] && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Branch: <span className="font-medium">{branches.data[0].name}</span>
            </p>
          )}
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Department names must be unique within each branch.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Save changes' : 'Create department'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
