'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Pencil,
  LayoutGrid,
  List,
  Users,
  UserCheck,
  UserX,
  Shield,
  Clock,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/layout/PageHeader';
import { ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { UserListCard, type UserListItem } from '@/components/users/UserListCard';
import { cn, formatDate } from '@/lib/utils';

interface Role {
  id: string;
  name: string;
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'super';

export default function UsersPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    isActive: true,
    roleIds: [] as string[],
  });

  const usersQuery = useQuery({
    queryKey: ['users', search],
    queryFn: async () => (await api.get('/users', { params: { pageSize: 100, search: search || undefined } })).data,
  });

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/roles')).data as (Role & { permissionKeys: string[] })[],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const payload: Record<string, unknown> = {
          firstName: form.firstName,
          lastName: form.lastName,
          roleIds: form.roleIds,
          isActive: form.isActive,
        };
        if (form.password) payload.password = form.password;
        return api.patch(`/users/${editing.id}`, payload);
      }
      return api.post('/users', form);
    },
    meta: {
      successMessage: editing ? 'User updated' : 'User created',
      errorMessage: 'Failed to save user',
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
  });

  const toggleActive = useMutation({
    mutationFn: (u: UserListItem) => api.patch(`/users/${u.id}`, { isActive: !u.isActive }),
    meta: { successMessage: 'User updated', errorMessage: 'Failed to update user' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ email: '', firstName: '', lastName: '', password: '', isActive: true, roleIds: [] });
    setModalOpen(true);
  };

  const openEdit = (u: UserListItem) => {
    setEditing(u);
    setForm({
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      password: '',
      isActive: u.isActive,
      roleIds: u.roles.map((r) => r.id),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const toggleRole = (id: string) =>
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(id) ? f.roleIds.filter((r) => r !== id) : [...f.roleIds, id],
    }));

  const allUsers: UserListItem[] = usersQuery.data?.data ?? [];

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;
      if (statusFilter === 'super' && !u.isSuperAdmin) return false;
      return true;
    });
  }, [allUsers, statusFilter]);

  const stats = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      total: allUsers.length,
      active: allUsers.filter((u) => u.isActive).length,
      inactive: allUsers.filter((u) => !u.isActive).length,
      superAdmins: allUsers.filter((u) => u.isSuperAdmin).length,
      withRoles: allUsers.filter((u) => u.roles.length > 0).length,
      recentLogins: allUsers.filter(
        (u) => u.lastLoginAt && new Date(u.lastLoginAt).getTime() >= thirtyDaysAgo,
      ).length,
    };
  }, [allUsers]);

  const canCreate = hasPermission('access.user.create');
  const canUpdate = hasPermission('access.user.update');
  const canDelete = hasPermission('access.user.delete');

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage staff and administrator accounts."
        action={
          canCreate && (
            <Button onClick={openCreate}>
              <Plus size={16} /> New User
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <button type="button" onClick={() => setStatusFilter('all')} className="text-left transition hover:scale-[1.02]">
          <ColorStatCard
            label="Total users"
            value={stats.total}
            hint="Staff accounts"
            icon={<Users size={22} />}
            color="violet"
            active={statusFilter === 'all'}
          />
        </button>
        <button type="button" onClick={() => setStatusFilter('active')} className="text-left transition hover:scale-[1.02]">
          <ColorStatCard
            label="Active"
            value={stats.active}
            hint="Can sign in"
            icon={<UserCheck size={22} />}
            color="emerald"
            active={statusFilter === 'active'}
          />
        </button>
        <button type="button" onClick={() => setStatusFilter('inactive')} className="text-left transition hover:scale-[1.02]">
          <ColorStatCard
            label="Inactive"
            value={stats.inactive}
            hint="Disabled accounts"
            icon={<UserX size={22} />}
            color="rose"
            active={statusFilter === 'inactive'}
          />
        </button>
        <button type="button" onClick={() => setStatusFilter('super')} className="text-left transition hover:scale-[1.02]">
          <ColorStatCard
            label="Super admins"
            value={stats.superAdmins}
            hint="Full access"
            icon={<Shield size={22} />}
            color="indigo"
            active={statusFilter === 'super'}
          />
        </button>
        <ColorStatCard
          label="With roles"
          value={stats.withRoles}
          hint={`${rolesQuery.data?.length ?? 0} roles available`}
          icon={<Shield size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="Recent logins"
          value={stats.recentLogins}
          hint="Last 30 days"
          icon={<Clock size={22} />}
          color="amber"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 sm:max-w-md">
          <Input
            placeholder="Search name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
            className="py-2.5"
          />
          <Button variant="outline" onClick={() => setSearch(searchInput)}>
            <Search size={16} />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500">
            {filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'}
            {statusFilter !== 'all' && ` · ${statusFilter}`}
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
      </div>

      {usersQuery.isLoading && <p className="text-sm text-slate-500">Loading users…</p>}

      {view === 'cards' && !usersQuery.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((u, i) => (
            <div key={u.id} className="relative">
              <UserListCard user={u} index={i} onClick={canUpdate ? () => openEdit(u) : undefined} />
              {canUpdate && (
                <div className="absolute right-3 top-3 z-20 flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="rounded-lg bg-white/90 p-1.5 text-slate-600 shadow-sm backdrop-blur hover:text-slate-900"
                  >
                    <Pencil size={14} />
                  </button>
                  {!u.isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => toggleActive.mutate(u)}
                      className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm backdrop-blur hover:text-slate-900"
                    >
                      {u.isActive ? 'Off' : 'On'}
                    </button>
                  )}
                  {canDelete && !u.isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete ${u.firstName} ${u.lastName}?`)) deleteMutation.mutate(u.id);
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

      {view === 'table' && !usersQuery.isLoading && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <thead>
              <tr>
                <SerialTh />
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Branch</Th>
                <Th>Roles</Th>
                <Th>Status</Th>
                <Th>Last login</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && <EmptyRow colSpan={8} message="No users found." />}
              {filteredUsers.map((u, i) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <SerialTd index={i} />
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">
                        {u.firstName.charAt(0)}
                        {u.lastName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">
                          {u.firstName} {u.lastName}
                        </span>
                        {u.isSuperAdmin && (
                          <Badge tone="brand" className="ml-2">
                            Super
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td className="text-slate-600">{u.email}</Td>
                  <Td className="text-slate-500">{u.branch?.name ?? '—'}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <span className="text-xs text-slate-400">—</span>}
                      {u.roles.map((r) => (
                        <Badge key={r.id} tone="blue">
                          {r.name}
                        </Badge>
                      ))}
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                  </Td>
                  <Td className="text-slate-500">{formatDate(u.lastLoginAt)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                            <Pencil size={14} /> Edit
                          </Button>
                          {!u.isSuperAdmin && (
                            <Button size="sm" variant="outline" onClick={() => toggleActive.mutate(u)}>
                              {u.isActive ? 'Disable' : 'Enable'}
                            </Button>
                          )}
                        </>
                      )}
                      {canDelete && !u.isSuperAdmin && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${u.firstName} ${u.lastName}?`)) deleteMutation.mutate(u.id);
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

      {!usersQuery.isLoading && filteredUsers.length === 0 && (
        <p className="mt-8 text-center text-sm text-slate-400">
          {allUsers.length === 0 ? 'No users yet. Create your first staff account.' : 'No users match your filters.'}
        </p>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit User' : 'New User'} size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <Input
              label="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={!!editing}
            required
          />
          <Input
            label={editing ? 'New password (leave blank to keep)' : 'Password'}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editing}
            minLength={8}
          />
          {!editing?.isSuperAdmin && (
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Account active</p>
                <p className="text-xs text-slate-500">Inactive users cannot sign in</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.isActive}
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={cn(
                  'relative h-7 w-12 shrink-0 rounded-full transition',
                  form.isActive ? 'bg-emerald-500' : 'bg-slate-300',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
                    form.isActive ? 'left-5' : 'left-0.5',
                  )}
                />
              </button>
            </label>
          )}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Roles</p>
            <div className="flex flex-wrap gap-2">
              {rolesQuery.data?.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => toggleRole(r.id)}
                  className={
                    form.roleIds.includes(r.id)
                      ? 'rounded-full bg-brand-600 px-3 py-1 text-sm text-white'
                      : 'rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200'
                  }
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing ? 'Save changes' : 'Create user'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
