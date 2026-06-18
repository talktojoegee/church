'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Check,
  X,
  Search,
  Filter,
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  Plane,
  Hash,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDefaultBranchId } from '@/lib/hooks';
import { Card, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { LEAVE_STATUS_TONES, LEAVE_STATUSES, LEAVE_TYPES, humanize } from '@/lib/constants';
import { formatDate, countWorkingDays } from '@/lib/utils';
import { MemberSelect } from '@/components/members/MemberSelect';

const TYPE_BADGE_TONES = ['blue', 'brand', 'green', 'amber', 'red'] as const;

const emptyFilters = {
  search: '',
  status: '',
  type: '',
  from: '',
  to: '',
};

function buildParams(filters: typeof emptyFilters, branchId?: string) {
  const params: Record<string, string> = {};
  if (branchId) params.branchId = branchId;
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.status) params.status = filters.status;
  if (filters.type) params.type = filters.type;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  return params;
}

export function LeaveTab() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branchId = useDefaultBranchId();
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [searchInput, setSearchInput] = useState('');

  const blank = { employeeId: '', type: 'ANNUAL', startDate: '', endDate: '', days: 0, reason: '' };
  const [form, setForm] = useState(blank);

  const params = buildParams(filters, branchId);

  const statsQuery = useQuery({
    queryKey: ['leave-stats', params],
    queryFn: async () => (await api.get('/hr/leave/stats', { params })).data,
  });
  const listQuery = useQuery({
    queryKey: ['leave', params],
    queryFn: async () => (await api.get('/hr/leave', { params })).data,
  });

  const save = useMutation({
    mutationFn: () => api.post('/hr/leave', { ...form, days: Number(form.days) }),
    meta: { successMessage: 'Leave request submitted', errorMessage: 'Failed to submit leave request' },
    onSuccess: () => {
      ['leave', 'leave-stats', 'hr-stats', 'employee'].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
      setOpen(false);
    },
  });

  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/hr/leave/${id}/review`, { status }),
    meta: { successMessage: 'Leave request updated', errorMessage: 'Failed to update leave request' },
    onSuccess: () => {
      ['leave', 'leave-stats', 'hr-stats', 'employee'].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
    },
  });

  const applySearch = () => setFilters((f) => ({ ...f, search: searchInput }));
  const clearFilters = () => {
    setSearchInput('');
    setFilters(emptyFilters);
  };

  const hasActiveFilters =
    filters.search || filters.status || filters.type || filters.from || filters.to;
  const stats = statsQuery.data;
  const rows = listQuery.data ?? [];

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ColorStatCard
          label="Total requests"
          value={stats?.total ?? '—'}
          icon={<CalendarDays size={22} />}
          color="violet"
        />
        <ColorStatCard
          label="Pending"
          value={stats?.pending ?? '—'}
          hint="Awaiting review"
          icon={<Clock size={22} />}
          color="amber"
        />
        <ColorStatCard
          label="Approved"
          value={stats?.approved ?? '—'}
          icon={<CheckCircle size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="Rejected"
          value={stats?.rejected ?? '—'}
          icon={<XCircle size={22} />}
          color="rose"
        />
        <ColorStatCard
          label="Total days"
          value={stats?.totalDays ?? '—'}
          hint="Across filtered requests"
          icon={<Plane size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="This month"
          value={stats?.thisMonth ?? '—'}
          hint="New requests"
          icon={<Hash size={22} />}
          color="indigo"
        />
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-sm">
        <div className="border-b border-amber-100/80 bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <Filter size={18} /> Filters
          </h3>
          <p className="mt-0.5 text-sm text-white/85">Search employees, filter by status, type, or dates</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Search employee</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Name, employee ID…"
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
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All statuses</option>
              {LEAVE_STATUSES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
            <Select
              label="Leave type"
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="">All types</option>
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
            <Input
              label="From date"
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
            <Input
              label="To date"
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </div>
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {filters.search && <Badge tone="brand">Search: {filters.search}</Badge>}
              {filters.status && <Badge tone="amber">{humanize(filters.status)}</Badge>}
              {filters.type && <Badge tone="blue">{humanize(filters.type)}</Badge>}
              {(filters.from || filters.to) && (
                <Badge tone="green">
                  {filters.from || '…'} → {filters.to || '…'}
                </Badge>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <X size={14} /> Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        {hasPermission('hr.leave.create') && (
          <Button
            onClick={() => {
              setForm(blank);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Request Leave
          </Button>
        )}
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <SerialTh />
              <Th>Employee</Th>
              <Th>Type</Th>
              <Th>Period</Th>
              <Th>Days</Th>
              <Th>Status</Th>
              <Th>Reason</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading && <EmptyRow colSpan={8} message="Loading…" />}
            {!listQuery.isLoading && rows.length === 0 && (
              <EmptyRow colSpan={8} message="No leave requests match your filters." />
            )}
            {rows.map((l: any, i: number) => (
              <tr key={l.id}>
                <SerialTd index={i} />
                <Td>
                  <Link
                    href={`/hr/employees/${l.employee.id}`}
                    className="font-medium text-slate-900 hover:text-violet-700"
                  >
                    {l.employee.firstName} {l.employee.lastName}
                  </Link>
                  <p className="text-xs text-slate-400">{l.employee.employeeNumber}</p>
                </Td>
                <Td>
                  <Badge tone={TYPE_BADGE_TONES[i % TYPE_BADGE_TONES.length]}>
                    {humanize(l.type)}
                  </Badge>
                </Td>
                <Td className="text-slate-500">
                  {formatDate(l.startDate)} – {formatDate(l.endDate)}
                </Td>
                <Td className="font-medium">{l.days}</Td>
                <Td>
                  <Badge tone={LEAVE_STATUS_TONES[l.status] ?? 'gray'}>{humanize(l.status)}</Badge>
                </Td>
                <Td className="max-w-xs truncate text-slate-500">{l.reason ?? '—'}</Td>
                <Td className="text-right">
                  {hasPermission('hr.leave.manage') && l.status === 'PENDING' && (
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => review.mutate({ id: l.id, status: 'APPROVED' })}
                        className="rounded p-1.5 text-emerald-500 hover:bg-emerald-50"
                        title="Approve"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => review.mutate({ id: l.id, status: 'REJECTED' })}
                        className="rounded p-1.5 text-rose-400 hover:bg-rose-50"
                        title="Reject"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Request Leave" size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <MemberSelect
            label="Employee"
            branchId={branchId}
            value={form.employeeId}
            onChange={(employeeId) => setForm({ ...form, employeeId })}
            allowAnonymous={false}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
            <Input
              label="Days"
              type="number"
              value={form.days || ''}
              readOnly
              disabled
              className="cursor-not-allowed bg-slate-50"
              placeholder="Select dates"
            />
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(e) => {
                const startDate = e.target.value;
                setForm({
                  ...form,
                  startDate,
                  days: countWorkingDays(startDate, form.endDate),
                });
              }}
              required
            />
            <Input
              label="End date"
              type="date"
              value={form.endDate}
              onChange={(e) => {
                const endDate = e.target.value;
                setForm({
                  ...form,
                  endDate,
                  days: countWorkingDays(form.startDate, endDate),
                });
              }}
              required
            />
          </div>
          <Input
            label="Reason"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending} disabled={form.days < 1 || !form.employeeId}>
              Submit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
