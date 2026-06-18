'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  LayoutGrid,
  List,
  Building2,
  Users,
  Layers,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranches, type BranchOption } from '@/lib/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { BranchListCard } from '@/components/branches/BranchListCard';
import { cn } from '@/lib/utils';

const empty = {
  name: '',
  code: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: 'Nigeria',
};

export default function BranchesPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchOption | null>(null);
  const [form, setForm] = useState(empty);

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { code, ...rest } = form;
        return api.patch(`/branches/${editing.id}`, rest);
      }
      return api.post('/branches', form);
    },
    meta: {
      successMessage: editing ? 'Branch updated' : 'Branch created',
      errorMessage: 'Failed to save branch',
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      setOpen(false);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (b: BranchOption, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditing(b);
    setForm({
      name: b.name,
      code: b.code,
      email: b.email ?? '',
      phone: b.phone ?? '',
      address: b.address ?? '',
      city: b.city ?? '',
      state: b.state ?? '',
      country: 'Nigeria',
    });
    setOpen(true);
  };

  const list = branches.data ?? [];

  const stats = useMemo(() => {
    return {
      total: list.length,
      active: list.filter((b) => b.isActive).length,
      members: list.reduce((s, b) => s + (b._count?.members ?? 0), 0),
      departments: list.reduce((s, b) => s + (b._count?.departments ?? 0), 0),
      groups: list.reduce((s, b) => s + (b._count?.groups ?? 0), 0),
      events: list.reduce((s, b) => s + (b._count?.events ?? 0), 0),
    };
  }, [list]);

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Manage your church campuses and locations."
        action={
          hasPermission('org.branch.create') && (
            <Button onClick={openCreate}>
              <Plus size={16} /> New Branch
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ColorStatCard
          label="Branches"
          value={stats.total}
          hint={`${stats.active} active`}
          icon={<Building2 size={22} />}
          color="violet"
        />
        <ColorStatCard
          label="Members"
          value={stats.members}
          hint="Across all branches"
          icon={<Users size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="Departments"
          value={stats.departments}
          hint="Total units"
          icon={<Building2 size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="Groups"
          value={stats.groups}
          hint="Cells & fellowships"
          icon={<Layers size={22} />}
          color="amber"
        />
        <ColorStatCard
          label="Events"
          value={stats.events}
          hint="Scheduled"
          icon={<CalendarDays size={22} />}
          color="indigo"
        />
        <ColorStatCard
          label="Locations"
          value={list.filter((b) => b.city || b.state).length}
          hint="With address"
          icon={<MapPin size={22} />}
          color="rose"
        />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {list.length} branch{list.length === 1 ? '' : 'es'}
        </p>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setView('cards')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
              view === 'cards' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
            )}
          >
            <LayoutGrid size={16} /> Cards
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
              view === 'table' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
            )}
          >
            <List size={16} /> Table
          </button>
        </div>
      </div>

      {branches.isLoading && <p className="text-sm text-slate-500">Loading branches…</p>}

      {view === 'cards' && !branches.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b, i) => (
            <div key={b.id} className="relative">
              <BranchListCard branch={b} index={i} />
              <div className="absolute right-3 top-3 z-20 flex gap-1">
                {hasPermission('org.branch.update') && (
                  <button
                    type="button"
                    onClick={(e) => openEdit(b, e)}
                    className="rounded-lg bg-white/90 p-1.5 text-slate-600 shadow-sm backdrop-blur hover:text-slate-900"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {hasPermission('org.branch.delete') && !b.isMain && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm(`Delete branch "${b.name}"?`)) del.mutate(b.id);
                    }}
                    className="rounded-lg bg-white/90 p-1.5 text-rose-500 shadow-sm backdrop-blur hover:text-rose-700"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'table' && !branches.isLoading && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <thead>
              <tr>
                <SerialTh />
                <Th>Branch</Th>
                <Th>Code</Th>
                <Th>Location</Th>
                <Th>Members</Th>
                <Th>Departments</Th>
                <Th>Groups</Th>
                <Th>Events</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <EmptyRow colSpan={10} message="No branches yet." />}
              {list.map((b, i) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <SerialTd index={i} />
                  <Td>
                    <Link
                      href={`/branches/${b.id}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {b.name}
                    </Link>
                    {b.isMain && (
                      <Badge tone="brand" className="ml-2">
                        Main
                      </Badge>
                    )}
                  </Td>
                  <Td className="font-mono text-xs">{b.code}</Td>
                  <Td className="text-slate-500">
                    {[b.city, b.state].filter(Boolean).join(', ') || '—'}
                  </Td>
                  <Td>{b._count?.members ?? 0}</Td>
                  <Td>{b._count?.departments ?? 0}</Td>
                  <Td>{b._count?.groups ?? 0}</Td>
                  <Td>{b._count?.events ?? 0}</Td>
                  <Td>
                    <Badge tone={b.isActive ? 'green' : 'gray'}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/branches/${b.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                      {hasPermission('org.branch.update') && (
                        <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                          <Pencil size={14} />
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {!branches.isLoading && list.length === 0 && (
        <p className="mt-8 text-center text-sm text-slate-400">No branches yet. Create your first branch.</p>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Branch' : 'New Branch'} size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Branch name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              disabled={!!editing}
              required
            />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Save changes' : 'Create branch'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
