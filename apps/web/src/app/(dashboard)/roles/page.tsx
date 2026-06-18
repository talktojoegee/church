'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, LayoutGrid, List, Shield, Users, Lock, KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/layout/PageHeader';
import { ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { RoleListCard, MODULE_STYLES, type RoleListItem } from '@/components/roles/RoleListCard';
import { cn } from '@/lib/utils';

type PermissionGroups = Record<string, { key: string; description: string | null }[]>;

export default function RolesPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoleListItem | null>(null);
  const [form, setForm] = useState({ name: '', description: '', permissionKeys: [] as string[] });

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/roles')).data as RoleListItem[],
  });
  const permsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => (await api.get('/roles/permissions')).data as PermissionGroups,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) return api.patch(`/roles/${editing.id}`, form);
      return api.post('/roles', form);
    },
    meta: {
      successMessage: editing ? 'Role updated' : 'Role created',
      errorMessage: 'Failed to save role',
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', permissionKeys: [] });
    setModalOpen(true);
  };

  const openEdit = (r: RoleListItem) => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description ?? '',
      permissionKeys: [...r.permissionKeys],
    });
    setModalOpen(true);
  };

  const togglePerm = (key: string) =>
    setForm((f) => ({
      ...f,
      permissionKeys: f.permissionKeys.includes(key)
        ? f.permissionKeys.filter((k) => k !== key)
        : [...f.permissionKeys, key],
    }));

  const toggleModule = (keys: string[]) =>
    setForm((f) => {
      const allSelected = keys.every((k) => f.permissionKeys.includes(k));
      return {
        ...f,
        permissionKeys: allSelected
          ? f.permissionKeys.filter((k) => !keys.includes(k))
          : Array.from(new Set([...f.permissionKeys, ...keys])),
      };
    });

  const roles = rolesQuery.data ?? [];

  const stats = useMemo(() => {
    const totalPerms = new Set(roles.flatMap((r) => r.permissionKeys)).size;
    return {
      roles: roles.length,
      system: roles.filter((r) => r.isSystem).length,
      custom: roles.filter((r) => !r.isSystem).length,
      users: roles.reduce((s, r) => s + r.userCount, 0),
      permissions: totalPerms,
      catalog: Object.values(permsQuery.data ?? {}).flat().length,
    };
  }, [roles, permsQuery.data]);

  const canCreate = hasPermission('access.role.create');
  const canUpdate = hasPermission('access.role.update');
  const canDelete = hasPermission('access.role.delete');

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Define what each type of user can access."
        action={
          canCreate && (
            <Button onClick={openCreate}>
              <Plus size={16} /> New Role
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ColorStatCard label="Roles" value={stats.roles} hint={`${stats.system} system`} icon={<Shield size={22} />} color="violet" />
        <ColorStatCard label="Custom roles" value={stats.custom} icon={<KeyRound size={22} />} color="emerald" />
        <ColorStatCard label="Assigned users" value={stats.users} icon={<Users size={22} />} color="blue" />
        <ColorStatCard label="Permissions in use" value={stats.permissions} icon={<KeyRound size={22} />} color="amber" />
        <ColorStatCard label="Permission catalog" value={stats.catalog} hint="Available keys" icon={<Shield size={22} />} color="indigo" />
        <ColorStatCard label="System roles" value={stats.system} hint="Protected" icon={<Lock size={22} />} color="rose" />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{roles.length} role{roles.length === 1 ? '' : 's'}</p>
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

      {view === 'cards' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r, i) => (
            <div key={r.id} className="relative">
              <RoleListCard role={r} index={i} onClick={canUpdate ? () => openEdit(r) : undefined} />
              {canUpdate && (
                <div className="absolute right-3 top-3 z-20 flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="rounded-lg bg-white/90 p-1.5 text-slate-600 shadow-sm backdrop-blur hover:text-slate-900"
                  >
                    <Pencil size={14} />
                  </button>
                  {canDelete && !r.isSystem && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete role "${r.name}"?`)) deleteMutation.mutate(r.id);
                      }}
                      className="rounded-lg bg-white/90 p-1.5 text-rose-500 shadow-sm backdrop-blur hover:text-rose-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {view === 'table' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <thead>
              <tr>
                <SerialTh />
                <Th>Role</Th>
                <Th>Description</Th>
                <Th>Users</Th>
                <Th>Permissions</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rolesQuery.isLoading && <EmptyRow colSpan={6} message="Loading…" />}
              {roles.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <SerialTd index={i} />
                  <Td>
                    <span className="flex items-center gap-2 font-semibold text-slate-900">
                      {r.name}
                      {r.isSystem && <Lock size={13} className="text-slate-400" />}
                    </span>
                  </Td>
                  <Td className="max-w-xs text-slate-500">{r.description ?? '—'}</Td>
                  <Td>{r.userCount}</Td>
                  <Td>
                    <Badge tone="blue">{r.permissionKeys.length}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate && (
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                          <Pencil size={14} /> Edit
                        </Button>
                      )}
                      {canDelete && !r.isSystem && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete role "${r.name}"?`)) deleteMutation.mutate(r.id);
                          }}
                          className="rounded p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Role: ${editing.name}` : 'New Role'}
        size="xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Role name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={editing?.isSystem}
              required
            />
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Permissions</p>
            <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-slate-200 p-3">
              {permsQuery.data &&
                Object.entries(permsQuery.data).map(([module, perms]) => {
                  const keys = perms.map((p) => p.key);
                  const allSelected = keys.every((k) => form.permissionKeys.includes(k));
                  const styles = MODULE_STYLES[module] ?? MODULE_STYLES.system;
                  return (
                    <div key={module} className={cn('rounded-xl border p-3', styles.header)}>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-bold capitalize">{module}</span>
                        <button
                          type="button"
                          onClick={() => toggleModule(keys)}
                          className="text-xs font-semibold underline-offset-2 hover:underline"
                        >
                          {allSelected ? 'Clear all' : 'Select all'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {perms.map((p) => {
                          const selected = form.permissionKeys.includes(p.key);
                          const short = p.key.split('.').slice(1).join('.');
                          return (
                            <button
                              key={p.key}
                              type="button"
                              title={p.description ?? p.key}
                              onClick={() => togglePerm(p.key)}
                              className={cn(
                                'rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition',
                                selected ? styles.chipActive : styles.chip,
                              )}
                            >
                              <span className="block">{short}</span>
                              {p.description && (
                                <span className={cn('mt-0.5 block text-[10px] opacity-80', selected && 'text-white/80')}>
                                  {p.description}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {form.permissionKeys.length} permission(s) selected
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing ? 'Save changes' : 'Create role'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
