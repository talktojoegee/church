'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  Search,
  Filter,
  X,
  Users,
  Heart,
  Eye,
  FolderOpen,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranches, useDefaultBranchId } from '@/lib/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import {
  CONTENT_STATUS_TONES,
  NIGERIAN_STATES,
  OUTREACH_STATUSES,
  humanize,
} from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface OutreachType {
  id: string;
  name: string;
  description: string | null;
  _count?: { outreaches: number };
}

interface Outreach {
  id: string;
  title: string;
  typeId: string | null;
  type?: { id: string; name: string } | null;
  state: string | null;
  location: string | null;
  description: string | null;
  startAt: string | null;
  status: string;
  coordinator: string | null;
  peopleReached: number | null;
  souls: number | null;
  images?: Array<{ id: string; url: string; caption?: string | null }>;
}

const PAGE_TABS = [
  { id: 'outreaches', label: 'Outreaches' },
  { id: 'types', label: 'Types' },
];

const emptyFilters = {
  search: '',
  status: '',
  typeId: '',
  state: '',
};

function buildParams(filters: typeof emptyFilters, branchId?: string) {
  const params: Record<string, string> = {};
  if (branchId) params.branchId = branchId;
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.status) params.status = filters.status;
  if (filters.typeId) params.typeId = filters.typeId;
  if (filters.state) params.state = filters.state;
  return params;
}

export default function OutreachesPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const branchId = useDefaultBranchId();
  const [tab, setTab] = useState('outreaches');
  const [open, setOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [editing, setEditing] = useState<Outreach | null>(null);
  const [editingType, setEditingType] = useState<OutreachType | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [searchInput, setSearchInput] = useState('');
  const [typeForm, setTypeForm] = useState({ name: '', description: '' });

  const blank = {
    branchId,
    title: '',
    typeId: '',
    state: '',
    location: '',
    description: '',
    startAt: '',
    endAt: '',
    status: 'PLANNED',
    coordinator: '',
    budget: '',
    peopleReached: '',
    souls: '',
    outcome: '',
  };
  const [form, setForm] = useState(blank);

  const queryParams = useMemo(
    () => buildParams(filters, branchId || undefined),
    [filters, branchId],
  );

  const typesQuery = useQuery({
    queryKey: ['outreach-types', branchId],
    queryFn: async () =>
      (await api.get('/outreach-types', { params: { branchId } })).data as OutreachType[],
    enabled: !!branchId,
  });

  const listQuery = useQuery({
    queryKey: ['outreaches', queryParams],
    queryFn: async () =>
      (await api.get('/outreaches', { params: queryParams })).data as Outreach[],
  });

  const statsQuery = useQuery({
    queryKey: ['outreaches-stats', queryParams],
    queryFn: async () => (await api.get('/outreaches/stats', { params: queryParams })).data,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['outreaches'] });
    qc.invalidateQueries({ queryKey: ['outreaches-stats'] });
    qc.invalidateQueries({ queryKey: ['outreach-types'] });
  };

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        branchId: branchId || form.branchId,
        budget: form.budget ? Number(form.budget) : undefined,
        peopleReached: form.peopleReached ? Number(form.peopleReached) : undefined,
        souls: form.souls ? Number(form.souls) : undefined,
      };
      if (!payload.startAt) delete payload.startAt;
      if (!payload.endAt) delete payload.endAt;
      if (!payload.typeId) payload.typeId = '';
      if (!payload.state) delete payload.state;
      if (editing) {
        delete payload.branchId;
        return api.patch(`/outreaches/${editing.id}`, payload);
      }
      return api.post('/outreaches', payload);
    },
    meta: {
      successMessage: editing ? 'Outreach updated' : 'Outreach created',
      errorMessage: 'Failed to save outreach',
    },
    onSuccess: () => {
      invalidateAll();
      setOpen(false);
    },
  });

  const saveType = useMutation({
    mutationFn: () => {
      const payload = { ...typeForm, branchId: branchId! };
      if (editingType) return api.patch(`/outreach-types/${editingType.id}`, typeForm);
      return api.post('/outreach-types', payload);
    },
    meta: {
      successMessage: editingType ? 'Type updated' : 'Type registered',
      errorMessage: 'Failed to save type',
    },
    onSuccess: () => {
      invalidateAll();
      setEditingType(null);
      setTypeForm({ name: '', description: '' });
      setTypeOpen(false);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/outreaches/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: invalidateAll,
  });

  const delType = useMutation({
    mutationFn: (id: string) => api.delete(`/outreach-types/${id}`),
    meta: { successMessage: 'Type deleted', errorMessage: 'Failed to delete type' },
    onSuccess: invalidateAll,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blank, branchId });
    setOpen(true);
  };

  const openEdit = (o: Outreach) => {
    setEditing(o);
    setForm({
      branchId: '',
      title: o.title,
      typeId: o.typeId ?? o.type?.id ?? '',
      state: o.state ?? '',
      location: o.location ?? '',
      description: o.description ?? '',
      startAt: o.startAt?.slice(0, 10) ?? '',
      endAt: '',
      status: o.status,
      coordinator: o.coordinator ?? '',
      budget: '',
      peopleReached: o.peopleReached ? String(o.peopleReached) : '',
      souls: o.souls ? String(o.souls) : '',
      outcome: '',
    });
    setOpen(true);
  };

  const openTypeModal = () => {
    setEditingType(null);
    setTypeForm({ name: '', description: '' });
    setTypeOpen(true);
  };

  const openTypeCreate = () => {
    openTypeModal();
    setTab('types');
  };

  const openTypeEdit = (t: OutreachType) => {
    setEditingType(t);
    setTypeForm({ name: t.name, description: t.description ?? '' });
    setTypeOpen(true);
  };

  const applySearch = () => setFilters((f) => ({ ...f, search: searchInput }));
  const clearFilters = () => {
    setSearchInput('');
    setFilters(emptyFilters);
  };

  const hasActiveFilters =
    filters.search || filters.status || filters.typeId || filters.state;

  const list = listQuery.data ?? [];
  const stats = statsQuery.data;
  const types = typesQuery.data ?? [];

  return (
    <div>
      <PageHeader
        title="Outreaches"
        description="Evangelism, charity and community impact."
        action={
          tab === 'outreaches' && hasPermission('content.outreach.create') ? (
            <Button onClick={openCreate}>
              <Plus size={16} /> New Outreach
            </Button>
          ) : tab === 'types' && hasPermission('content.outreach.create') ? (
            <Button onClick={openTypeCreate}>
              <Plus size={16} /> New Type
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColorStatCard
          label="Total outreaches"
          value={stats?.total ?? '—'}
          icon={<Megaphone size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="Planned"
          value={stats?.planned ?? '—'}
          hint={`${stats?.completed ?? 0} completed`}
          icon={<Clock size={22} />}
          color="amber"
        />
        <ColorStatCard
          label="People reached"
          value={stats?.peopleReached ?? '—'}
          icon={<Users size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="Souls won"
          value={stats?.souls ?? '—'}
          hint={`${stats?.types ?? 0} types`}
          icon={<Heart size={22} />}
          color="rose"
        />
      </div>

      <Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} />

      {tab === 'outreaches' && (
        <>
          <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/20">
            <div className="border-b border-emerald-100/80 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 dark:border-emerald-900/50">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <Filter size={18} /> Filters
              </h3>
              <p className="mt-0.5 text-sm text-white/80">Type, status, state, and search</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Search
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                      <Input
                        className="pl-9"
                        placeholder="Title, location, coordinator…"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                      />
                    </div>
                    <Button type="button" onClick={applySearch}>
                      Search
                    </Button>
                  </div>
                </div>
                <Select
                  label="Type"
                  value={filters.typeId}
                  onChange={(e) => setFilters({ ...filters, typeId: e.target.value })}
                >
                  <option value="">All types</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Status"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All statuses</option>
                  {OUTREACH_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {humanize(s)}
                    </option>
                  ))}
                </Select>
                <Select
                  label="State / location"
                  value={filters.state}
                  onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                >
                  <option value="">All states</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s === 'Others' ? 'Others (outside Nigeria)' : s}
                    </option>
                  ))}
                </Select>
              </div>
              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {filters.search && <Badge tone="brand">Search: {filters.search}</Badge>}
                  {filters.typeId && (
                    <Badge tone="blue">
                      {types.find((t) => t.id === filters.typeId)?.name ?? 'Type'}
                    </Badge>
                  )}
                  {filters.status && (
                    <Badge tone={CONTENT_STATUS_TONES[filters.status] ?? 'gray'}>
                      {humanize(filters.status)}
                    </Badge>
                  )}
                  {filters.state && <Badge tone="gray">{filters.state}</Badge>}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"
                  >
                    <X size={12} /> Clear all
                  </button>
                </div>
              )}
            </div>
          </div>

          <Card>
            <CardHeader
              title="All outreaches"
              description={`${list.length} outreach${list.length === 1 ? '' : 'es'} found`}
            />
            <Table>
              <thead>
                <tr>
                  <SerialTh />
                  <Th>Outreach</Th>
                  <Th>Type</Th>
                  <Th>State</Th>
                  <Th>Date</Th>
                  <Th>Reached</Th>
                  <Th>Souls</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading && <EmptyRow colSpan={9} message="Loading…" />}
                {!listQuery.isLoading && list.length === 0 && (
                  <EmptyRow colSpan={9} message="No outreaches match your filters." />
                )}
                {list.map((o, i) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                    onClick={() => router.push(`/outreaches/${o.id}`)}
                  >
                    <SerialTd index={i} />
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                          <Megaphone size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{o.title}</p>
                          {o.location && (
                            <p className="line-clamp-1 text-xs text-slate-500">{o.location}</p>
                          )}
                          {o.images && o.images.length > 0 && (
                            <p className="line-clamp-1 text-xs text-emerald-600">
                              {o.images.length} photo{o.images.length === 1 ? '' : 's'}
                            </p>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td>{o.type?.name ?? '—'}</Td>
                    <Td>{o.state ?? '—'}</Td>
                    <Td>{o.startAt ? formatDate(o.startAt) : '—'}</Td>
                    <Td>{o.peopleReached ?? 0}</Td>
                    <Td>{o.souls ?? 0}</Td>
                    <Td>
                      <Badge tone={CONTENT_STATUS_TONES[o.status] ?? 'gray'}>
                        {humanize(o.status)}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/outreaches/${o.id}`);
                          }}
                        >
                          <Eye size={14} /> View
                        </Button>
                        {hasPermission('content.outreach.update') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(o);
                            }}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {hasPermission('content.outreach.delete') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete outreach?')) del.mutate(o.id);
                            }}
                            className="rounded p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}

      {tab === 'types' && (
        <Card>
          <CardHeader
            title="Outreach types"
            description="Register types before assigning them to outreaches"
          />
          <Table>
            <thead>
              <tr>
                <SerialTh />
                <Th>Type</Th>
                <Th>Description</Th>
                <Th>Outreaches</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {typesQuery.isLoading && <EmptyRow colSpan={5} message="Loading…" />}
              {!typesQuery.isLoading && types.length === 0 && (
                <EmptyRow colSpan={5} message="No types registered yet." />
              )}
              {types.map((t, i) => (
                <tr key={t.id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                  <SerialTd index={i} />
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
                        <FolderOpen size={16} />
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{t.name}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className="line-clamp-1 text-slate-500">{t.description ?? '—'}</span>
                  </Td>
                  <Td>{t._count?.outreaches ?? 0}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      {hasPermission('content.outreach.update') && (
                        <button
                          type="button"
                          onClick={() => openTypeEdit(t)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {hasPermission('content.outreach.delete') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete type "${t.name}"? Outreaches will be unlinked.`)) {
                              delType.mutate(t.id);
                            }
                          }}
                          className="rounded p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Outreach' : 'New Outreach'}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Select
                label="Type"
                value={form.typeId}
                onChange={(e) => setForm({ ...form, typeId: e.target.value })}
              >
                <option value="">No type</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              {hasPermission('content.outreach.create') && (
                <button
                  type="button"
                  onClick={openTypeModal}
                  className="mt-1 text-xs font-medium text-emerald-600 hover:underline"
                >
                  + Register new type
                </button>
              )}
            </div>
            <Select
              label="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            >
              <option value="">Select state</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s === 'Others' ? 'Others (outside Nigeria)' : s}
                </option>
              ))}
            </Select>
            <Input
              label="Venue / address"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Hospital name, street, city…"
            />
            <Input
              label="Start date"
              type="date"
              value={form.startAt}
              onChange={(e) => setForm({ ...form, startAt: e.target.value })}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {OUTREACH_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
            <Input
              label="Coordinator"
              value={form.coordinator}
              onChange={(e) => setForm({ ...form, coordinator: e.target.value })}
            />
            <Input
              label="Budget"
              type="number"
              min={0}
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            />
            <Input
              label="People reached"
              type="number"
              min={0}
              value={form.peopleReached}
              onChange={(e) => setForm({ ...form, peopleReached: e.target.value })}
            />
            <Input
              label="Souls won"
              type="number"
              min={0}
              value={form.souls}
              onChange={(e) => setForm({ ...form, souls: e.target.value })}
            />
            {!editing && (branches.data?.length ?? 0) > 1 && (
              <Select
                label="Branch"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                required
              >
                {branches.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Textarea
            label="Outcome (optional)"
            value={form.outcome}
            onChange={(e) => setForm({ ...form, outcome: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={typeOpen}
        onClose={() => {
          setTypeOpen(false);
          setEditingType(null);
          setTypeForm({ name: '', description: '' });
        }}
        title={editingType ? 'Edit type' : 'New type'}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveType.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Type name"
            value={typeForm.name}
            onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
            required
            placeholder="Evangelism, Charity, Medical…"
          />
          <Textarea
            label="Description (optional)"
            value={typeForm.description}
            onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTypeOpen(false);
                setEditingType(null);
                setTypeForm({ name: '', description: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saveType.isPending}>
              {editingType ? 'Save type' : 'Register type'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
