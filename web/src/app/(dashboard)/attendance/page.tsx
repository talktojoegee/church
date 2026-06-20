'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Users,
  TrendingUp,
  Activity,
  CalendarDays,
  Search,
  Filter,
  X,
  Eye,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranches } from '@/lib/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { ColorStatCard, Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { MemberPicker } from '@/components/members/MemberPicker';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { AttendanceTrendChart } from '@/components/dashboard/BarChart';
import { humanize } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

const SERVICE_TYPES = [
  'SUNDAY_SERVICE',
  'MIDWEEK_SERVICE',
  'PRAYER_MEETING',
  'BIBLE_STUDY',
  'SPECIAL_PROGRAM',
  'OTHER',
];

const TYPE_BADGE: Record<string, 'brand' | 'blue' | 'green' | 'amber' | 'gray' | 'red'> = {
  SUNDAY_SERVICE: 'brand',
  MIDWEEK_SERVICE: 'blue',
  PRAYER_MEETING: 'red',
  BIBLE_STUDY: 'green',
  SPECIAL_PROGRAM: 'amber',
  OTHER: 'gray',
};

const emptyFilters = {
  search: '',
  type: '',
  dateFrom: '',
  dateTo: '',
  branchId: '',
};

interface Session {
  id: string;
  title: string;
  type: string;
  date: string;
  totalCount: number;
  maleCount: number;
  femaleCount: number;
  childrenCount: number;
  newcomerCount: number;
  branch: { name: string };
  _count: { records: number };
}

const empty = {
  title: '',
  branchId: '',
  type: 'SUNDAY_SERVICE',
  date: new Date().toISOString().slice(0, 10),
  maleCount: 0,
  femaleCount: 0,
  childrenCount: 0,
  newcomerCount: 0,
  notes: '',
};

function buildParams(filters: typeof emptyFilters, pageSize = 50) {
  const params: Record<string, string | number> = { pageSize };
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.type) params.type = filters.type;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.branchId) params.branchId = filters.branchId;
  return params;
}

export default function AttendancePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [checkIn, setCheckIn] = useState<string[]>([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [searchInput, setSearchInput] = useState('');

  const queryParams = useMemo(() => buildParams(filters), [filters]);

  const sessionsQuery = useQuery({
    queryKey: ['attendance', queryParams],
    queryFn: async () => (await api.get('/attendance', { params: queryParams })).data,
  });

  const statsQuery = useQuery({
    queryKey: ['attendance-stats', queryParams],
    queryFn: async () => (await api.get('/attendance/stats', { params: queryParams })).data,
  });

  const save = useMutation({
    mutationFn: () =>
      api.post('/attendance', {
        ...form,
        presentMemberIds: checkIn.length ? checkIn : undefined,
      }),
    meta: { successMessage: 'Attendance recorded', errorMessage: 'Failed to save session' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-stats'] });
      setOpen(false);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/attendance/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-stats'] });
    },
  });

  const openCreate = () => {
    const main = branches.data?.find((b) => b.isMain) ?? branches.data?.[0];
    setForm({ ...empty, branchId: main?.id ?? '' });
    setCheckIn([]);
    setOpen(true);
  };

  const applySearch = () => {
    setFilters((f) => ({ ...f, search: searchInput }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters(emptyFilters);
  };

  const hasActiveFilters =
    filters.search || filters.type || filters.dateFrom || filters.dateTo || filters.branchId;

  const rows: Session[] = sessionsQuery.data?.data ?? [];
  const stats = statsQuery.data;

  const trendData =
    stats?.trend?.map((t: any) => ({
      id: t.id,
      label: new Date(t.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
      title: t.title,
      male: t.maleCount ?? 0,
      female: t.femaleCount ?? 0,
      children: t.childrenCount ?? 0,
      newcomers: t.newcomerCount ?? 0,
    })) ?? [];

  const pieData =
    stats?.byType
      ?.filter((t: any) => t.totalAttendance > 0)
      .map((t: any) => ({
        label: humanize(t.type),
        value: t.totalAttendance,
      })) ?? [];

  const num = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: Number(e.target.value) });

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Track service attendance and growth trends."
        action={
          hasPermission('engagement.attendance.create') && (
            <Button onClick={openCreate}>
              <Plus size={16} /> Record Service
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColorStatCard
          label="Last service"
          value={stats?.lastTotal ?? '—'}
          hint="Most recent headcount"
          icon={<Users size={22} />}
          color="violet"
        />
        <ColorStatCard
          label="Monthly average"
          value={stats?.monthAverage ?? '—'}
          hint="This month"
          icon={<Activity size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="Monthly peak"
          value={stats?.monthPeak ?? '—'}
          hint="Highest this month"
          icon={<TrendingUp size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="Services (month)"
          value={stats?.monthSessions ?? '—'}
          hint={hasActiveFilters ? `${stats?.filteredSessions ?? 0} in filter` : undefined}
          icon={<CalendarDays size={22} />}
          color="amber"
        />
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 shadow-sm dark:border-indigo-900/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-sky-950/30">
        <div className="border-b border-indigo-100/80 bg-gradient-to-r from-indigo-600 to-sky-600 px-5 py-4 dark:border-indigo-900/50">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <Filter size={18} /> Filters
          </h3>
          <p className="mt-0.5 text-sm text-white/80">Narrow sessions by date, type, branch, or search</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Search
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Service title…"
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
              label="Service type"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All types</option>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
            <Input
              label="From date"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
            <Input
              label="To date"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
            {(branches.data?.length ?? 0) > 1 && (
              <Select
                label="Branch"
                value={filters.branchId}
                onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
              >
                <option value="">All branches</option>
                {branches.data?.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {filters.search && <Badge tone="brand">Search: {filters.search}</Badge>}
              {filters.type && <Badge tone="blue">{humanize(filters.type)}</Badge>}
              {filters.dateFrom && <Badge tone="gray">From {formatDate(filters.dateFrom)}</Badge>}
              {filters.dateTo && <Badge tone="gray">To {formatDate(filters.dateTo)}</Badge>}
              {filters.branchId && (
                <Badge tone="gray">
                  {branches.data?.find((b: any) => b.id === filters.branchId)?.name ?? 'Branch'}
                </Badge>
              )}
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

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {stats?.trend?.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 px-5 py-4 dark:border-slate-800 dark:from-violet-950/40 dark:to-purple-950/30">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <BarChart3 size={18} className="text-violet-600" /> Attendance trend
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Last 12 matching services — male, female, children & newcomers per service
              </p>
            </div>
            <div className="p-5">
              <AttendanceTrendChart
                data={trendData}
                onSessionClick={(sessionId) => router.push(`/attendance/${sessionId}`)}
              />
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 dark:border-slate-800 dark:from-emerald-950/40 dark:to-teal-950/30">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <PieChart size={18} className="text-emerald-600" /> Attendance by type
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {hasActiveFilters
                ? `${stats?.filteredSessions ?? 0} sessions · ${stats?.filteredTotal ?? 0} total`
                : 'Distribution across service types'}
            </p>
          </div>
          <div className="p-5">
            {pieData.length ? (
              <DonutChart data={pieData} centerValue={stats?.filteredTotal ?? 0} centerLabel="total" />
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">
                No attendance data for the current filters.
              </p>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Service records"
          description={`${sessionsQuery.data?.total ?? rows.length} session(s) found`}
        />
        <Table>
          <thead>
            <tr>
              <SerialTh />
              <Th>Service</Th>
              <Th>Date</Th>
              <Th>Type</Th>
              <Th>Total</Th>
              <Th>M / F / Children</Th>
              <Th>New</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {sessionsQuery.isLoading && <EmptyRow colSpan={8} message="Loading…" />}
            {!sessionsQuery.isLoading && rows.length === 0 && (
              <EmptyRow colSpan={8} message="No services match your filters." />
            )}
            {rows.map((s, i) => (
              <tr
                key={s.id}
                className="cursor-pointer hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
                onClick={() => router.push(`/attendance/${s.id}`)}
              >
                <SerialTd index={i} />
                <Td>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{s.title}</span>
                  {s._count.records > 0 && (
                    <span className="ml-2 text-xs text-slate-400">({s._count.records} checked in)</span>
                  )}
                </Td>
                <Td>{formatDate(s.date)}</Td>
                <Td>
                  <Badge tone={TYPE_BADGE[s.type] ?? 'gray'}>{humanize(s.type)}</Badge>
                </Td>
                <Td className="font-semibold text-slate-900 dark:text-slate-100">{s.totalCount}</Td>
                <Td className="text-slate-500">
                  {s.maleCount} / {s.femaleCount} / {s.childrenCount}
                </Td>
                <Td>{s.newcomerCount}</Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/attendance/${s.id}`);
                      }}
                    >
                      <Eye size={14} /> View
                    </Button>
                    {hasPermission('engagement.attendance.delete') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this service record?')) del.mutate(s.id);
                        }}
                        className="rounded p-1.5 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Record Service Attendance" size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Service title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sunday First Service" required />
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            {(branches.data?.length ?? 0) > 1 && (
              <Select label="Branch" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required>
                {branches.data?.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Headcount</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Input label="Male" type="number" min={0} value={form.maleCount} onChange={num('maleCount')} />
              <Input label="Female" type="number" min={0} value={form.femaleCount} onChange={num('femaleCount')} />
              <Input label="Children" type="number" min={0} value={form.childrenCount} onChange={num('childrenCount')} />
              <Input label="Newcomers" type="number" min={0} value={form.newcomerCount} onChange={num('newcomerCount')} />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Total: {form.maleCount + form.femaleCount + form.childrenCount || checkIn.length}
            </p>
          </div>

          <details className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
              Optional: check in specific members ({checkIn.length})
            </summary>
            <div className="mt-3">
              <MemberPicker branchId={form.branchId} selected={checkIn} onChange={setCheckIn} />
            </div>
          </details>

          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              Save record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
