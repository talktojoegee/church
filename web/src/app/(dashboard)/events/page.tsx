'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  CalendarCheck,
  Users,
  Check,
  Search,
  Filter,
  X,
  CalendarDays,
  Megaphone,
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
import { CONTENT_STATUS_TONES, EVENT_STATUSES, humanize } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface EventItem {
  id: string;
  title: string;
  location: string | null;
  startAt: string;
  endAt: string | null;
  capacity: number | null;
  status: string;
  branch?: { name: string };
  _count: { registrations: number };
}

const emptyFilters = {
  search: '',
  status: '',
  startDate: '',
  endDate: '',
};

function buildParams(filters: typeof emptyFilters, branchId?: string) {
  const params: Record<string, string> = {};
  if (branchId) params.branchId = branchId;
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.status) params.status = filters.status;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  return params;
}

export default function EventsPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const searchParams = useSearchParams();
  const branches = useBranches();
  const branchId = useDefaultBranchId();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [viewEvent, setViewEvent] = useState<any>(null);
  const [guest, setGuest] = useState({ guestName: '', guestPhone: '' });
  const [filters, setFilters] = useState(emptyFilters);
  const [searchInput, setSearchInput] = useState('');

  const blank = {
    branchId,
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    capacity: '',
    status: 'DRAFT',
  };
  const [form, setForm] = useState(blank);

  const queryParams = useMemo(() => buildParams(filters, branchId || undefined), [filters, branchId]);

  const listQuery = useQuery({
    queryKey: ['events', queryParams],
    queryFn: async () => (await api.get('/events', { params: queryParams })).data as EventItem[],
  });

  const statsQuery = useQuery({
    queryKey: ['events-stats', queryParams],
    queryFn: async () => (await api.get('/events/stats', { params: queryParams })).data,
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        branchId: branchId || form.branchId,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      };
      if (!payload.endAt) delete payload.endAt;
      if (editing) {
        delete payload.branchId;
        return api.patch(`/events/${editing.id}`, payload);
      }
      return api.post('/events', payload);
    },
    meta: {
      successMessage: editing ? 'Event updated' : 'Event created',
      errorMessage: 'Failed to save event',
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events-stats'] });
      setOpen(false);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events-stats'] });
    },
  });

  const register = useMutation({
    mutationFn: () => api.post(`/events/${viewEvent.id}/register`, guest),
    meta: { successMessage: 'Guest registered', errorMessage: 'Failed to register guest' },
    onSuccess: async () => {
      setGuest({ guestName: '', guestPhone: '' });
      setViewEvent((await api.get(`/events/${viewEvent.id}`)).data);
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events-stats'] });
    },
  });

  const toggle = useMutation({
    mutationFn: (regId: string) => api.patch(`/events/registrations/${regId}/attended`),
    meta: { successMessage: 'Attendance updated', errorMessage: 'Failed to update attendance' },
    onSuccess: async () => setViewEvent((await api.get(`/events/${viewEvent.id}`)).data),
  });

  const openView = useCallback(
    async (eventId: string) => setViewEvent((await api.get(`/events/${eventId}`)).data),
    [],
  );

  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId) openView(viewId);
  }, [searchParams, openView]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blank, branchId });
    setOpen(true);
  };

  const openEdit = (e: EventItem) => {
    setEditing(e);
    setForm({
      branchId: '',
      title: e.title,
      description: '',
      location: e.location ?? '',
      startAt: e.startAt.slice(0, 16),
      endAt: e.endAt?.slice(0, 16) ?? '',
      capacity: e.capacity ? String(e.capacity) : '',
      status: e.status,
    });
    setOpen(true);
  };

  const applySearch = () => setFilters((f) => ({ ...f, search: searchInput }));
  const clearFilters = () => {
    setSearchInput('');
    setFilters(emptyFilters);
  };

  const hasActiveFilters =
    filters.search || filters.status || filters.startDate || filters.endDate;

  const list = listQuery.data ?? [];
  const stats = statsQuery.data;

  return (
    <div>
      <PageHeader
        title="Events"
        description="Services, programs and special gatherings."
        action={
          hasPermission('engagement.event.create') && (
            <Button onClick={openCreate}>
              <Plus size={16} /> New Event
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColorStatCard
          label="Total events"
          value={stats?.total ?? '—'}
          icon={<CalendarCheck size={22} />}
          color="violet"
        />
        <ColorStatCard
          label="Published"
          value={stats?.published ?? '—'}
          hint={`${stats?.draft ?? 0} drafts`}
          icon={<Megaphone size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="Upcoming"
          value={stats?.upcoming ?? '—'}
          hint="Published & scheduled"
          icon={<Clock size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="Registrations"
          value={stats?.registrations ?? '—'}
          hint="Across filtered events"
          icon={<Users size={22} />}
          color="amber"
        />
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 shadow-sm dark:border-violet-900/40 dark:from-violet-950/40 dark:via-slate-900 dark:to-fuchsia-950/20">
        <div className="border-b border-violet-100/80 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-4 dark:border-violet-900/50">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <Filter size={18} /> Filters
          </h3>
          <p className="mt-0.5 text-sm text-white/80">Search, status, and date range</p>
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
                    placeholder="Title, location…"
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
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All statuses</option>
              {EVENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
            <Input
              label="Start date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            <Input
              label="End date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {filters.search && <Badge tone="brand">Search: {filters.search}</Badge>}
              {filters.status && <Badge tone="blue">{humanize(filters.status)}</Badge>}
              {filters.startDate && <Badge tone="gray">From {formatDate(filters.startDate)}</Badge>}
              {filters.endDate && <Badge tone="gray">To {formatDate(filters.endDate)}</Badge>}
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
          title="All events"
          description={`${list.length} event${list.length === 1 ? '' : 's'} found`}
        />
        <Table>
          <thead>
            <tr>
              <SerialTh />
              <Th>Event</Th>
              <Th>Date</Th>
              <Th>Location</Th>
              <Th>Status</Th>
              <Th>Registrations</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading && <EmptyRow colSpan={7} message="Loading…" />}
            {!listQuery.isLoading && list.length === 0 && (
              <EmptyRow colSpan={7} message="No events match your filters." />
            )}
            {list.map((e, i) => (
              <tr
                key={e.id}
                className="hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
              >
                <SerialTd index={i} />
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
                      <CalendarDays size={16} />
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{e.title}</span>
                  </div>
                </Td>
                <Td>{formatDate(e.startAt)}</Td>
                <Td className="text-slate-500">{e.location ?? '—'}</Td>
                <Td>
                  <Badge tone={CONTENT_STATUS_TONES[e.status] ?? 'gray'}>{humanize(e.status)}</Badge>
                </Td>
                <Td>
                  <span className="flex items-center gap-1.5 text-sm">
                    <Users size={14} className="text-violet-500" />
                    <span className="font-medium">{e._count.registrations}</span>
                    {e.capacity != null && (
                      <span className="text-slate-400">/ {e.capacity}</span>
                    )}
                  </span>
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => openView(e.id)}>
                      Registrations
                    </Button>
                    {hasPermission('engagement.event.update') && (
                      <button
                        type="button"
                        onClick={() => openEdit(e)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {hasPermission('engagement.event.delete') && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Delete event?')) del.mutate(e.id);
                        }}
                        className="rounded p-1.5 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Event' : 'New Event'} size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Start" type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} required />
            <Input label="End" type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Input label="Capacity" type="number" min={0} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {EVENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
            {!editing && (branches.data?.length ?? 0) > 1 && (
              <Select label="Branch" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required>
                {branches.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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

      <Modal open={!!viewEvent} onClose={() => setViewEvent(null)} title={viewEvent?.title ?? ''} size="lg">
        {viewEvent && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={CONTENT_STATUS_TONES[viewEvent.status] ?? 'gray'}>
                {humanize(viewEvent.status)}
              </Badge>
              <span className="text-sm text-slate-500">{formatDate(viewEvent.startAt)}</span>
              {viewEvent.location && (
                <span className="text-sm text-slate-500">· {viewEvent.location}</span>
              )}
            </div>
            {hasPermission('engagement.event.update') && (
              <div className="flex items-end gap-2 rounded-xl bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3 dark:from-violet-950/30 dark:to-fuchsia-950/20">
                <Input label="Guest name" value={guest.guestName} onChange={(e) => setGuest({ ...guest, guestName: e.target.value })} />
                <Input label="Phone" value={guest.guestPhone} onChange={(e) => setGuest({ ...guest, guestPhone: e.target.value })} />
                <Button onClick={() => register.mutate()} loading={register.isPending} disabled={!guest.guestName}>
                  Add
                </Button>
              </div>
            )}
            <Table>
              <thead>
                <tr>
                  <SerialTh />
                  <Th>Name</Th>
                  <Th>Phone</Th>
                  <Th>Attended</Th>
                </tr>
              </thead>
              <tbody>
                {viewEvent.registrations.length === 0 && (
                  <EmptyRow colSpan={4} message="No registrations." />
                )}
                {viewEvent.registrations.map((r: any, i: number) => (
                  <tr key={r.id}>
                    <SerialTd index={i} />
                    <Td className="font-medium text-slate-900 dark:text-slate-100">
                      {r.member ? `${r.member.firstName} ${r.member.lastName}` : r.guestName}
                    </Td>
                    <Td className="text-slate-500">{r.guestPhone ?? '—'}</Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => toggle.mutate(r.id)}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                          r.attended
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}
                      >
                        <Check size={13} /> {r.attended ? 'Present' : 'Mark'}
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Modal>
    </div>
  );
}
