'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Eye,
  Trash2,
  Search,
  Filter,
  X,
  Wallet,
  FileText,
  CheckCircle,
  Clock,
  Users,
  Receipt,
  RefreshCw,
  MinusCircle,
  Printer,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useChurchBranding, useDefaultBranchId } from '@/lib/hooks';
import { printPayslip } from '@/lib/print-payslip';
import { Card, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { humanize } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { EmployeeSelect } from '@/components/hr/EmployeeSelect';

const STATUS_TONES: Record<string, 'gray' | 'amber' | 'green'> = {
  DRAFT: 'gray',
  PROCESSED: 'amber',
  PAID: 'green',
};

const PAY_RUN_STATUSES = ['DRAFT', 'PROCESSED', 'PAID'] as const;

const emptyFilters = {
  search: '',
  status: '',
  period: '',
  from: '',
  to: '',
};

type BreakdownLine = {
  name: string;
  type: string;
  amount: number;
  isPercentage?: boolean;
  source?: string;
};

function buildParams(filters: typeof emptyFilters, branchId?: string) {
  const params: Record<string, string> = {};
  if (branchId) params.branchId = branchId;
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.status) params.status = filters.status;
  if (filters.period) params.period = filters.period;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  return params;
}

export function PayrollTab() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branding = useChurchBranding();
  const branchId = useDefaultBranchId();
  const [open, setOpen] = useState(false);
  const [viewRun, setViewRun] = useState<any>(null);
  const [viewPayslip, setViewPayslip] = useState<any>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [searchInput, setSearchInput] = useState('');
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({ title: '', period: thisMonth, notes: '' });
  const [adjustmentPeriod, setAdjustmentPeriod] = useState(thisMonth);
  const [adjForm, setAdjForm] = useState({
    employeeId: '',
    name: '',
    type: 'DEDUCTION',
    amount: '',
  });

  const params = buildParams(filters, branchId);

  const statsQuery = useQuery({
    queryKey: ['payroll-stats', params],
    queryFn: async () => (await api.get('/hr/payroll/stats', { params })).data,
  });
  const listQuery = useQuery({
    queryKey: ['payruns', params],
    queryFn: async () => (await api.get('/hr/payroll', { params })).data,
  });
  const adjustmentsQuery = useQuery({
    queryKey: ['payroll-period-adjustments', branchId, adjustmentPeriod],
    queryFn: async () =>
      (
        await api.get('/hr/payroll/period-adjustments', {
          params: { branchId, period: adjustmentPeriod },
        })
      ).data,
    enabled: !!branchId && !!adjustmentPeriod,
  });

  const save = useMutation({
    mutationFn: () => api.post('/hr/payroll', { ...form, branchId }),
    meta: { successMessage: 'Pay run created', errorMessage: 'Failed to create pay run' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payruns'] });
      qc.invalidateQueries({ queryKey: ['payroll-stats'] });
      qc.invalidateQueries({ queryKey: ['payroll-period-adjustments'] });
      setOpen(false);
    },
  });

  const addAdjustment = useMutation({
    mutationFn: () =>
      api.post('/hr/payroll/period-adjustments', {
        branchId,
        period: adjustmentPeriod,
        employeeId: adjForm.employeeId,
        name: adjForm.name,
        type: adjForm.type,
        amount: Number(adjForm.amount),
      }),
    meta: { successMessage: 'Adjustment saved', errorMessage: 'Failed to save adjustment' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-period-adjustments'] });
      setAdjForm({ employeeId: '', name: '', type: 'DEDUCTION', amount: '' });
    },
  });

  const removeAdjustment = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/payroll/period-adjustments/${id}`),
    meta: { successMessage: 'Adjustment removed', errorMessage: 'Failed to remove adjustment' },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['payroll-period-adjustments'] });
      if (viewRun?.status === 'DRAFT') {
        setViewRun((await api.get(`/hr/payroll/${viewRun.id}`)).data);
      }
    },
  });

  const recalculate = useMutation({
    mutationFn: (id: string) => api.post(`/hr/payroll/${id}/recalculate`),
    meta: { successMessage: 'Pay run recalculated', errorMessage: 'Failed to recalculate' },
    onSuccess: async (res) => {
      qc.invalidateQueries({ queryKey: ['payruns'] });
      qc.invalidateQueries({ queryKey: ['payroll-stats'] });
      setViewRun(res.data);
    },
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/hr/payroll/${id}`, { status }),
    meta: { successMessage: 'Payroll updated', errorMessage: 'Failed to update payroll' },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['payruns'] });
      qc.invalidateQueries({ queryKey: ['payroll-stats'] });
      if (viewRun) setViewRun((await api.get(`/hr/payroll/${viewRun.id}`)).data);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/payroll/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payruns'] });
      qc.invalidateQueries({ queryKey: ['payroll-stats'] });
      qc.invalidateQueries({ queryKey: ['payroll-period-adjustments'] });
    },
  });

  const openView = async (id: string) => setViewRun((await api.get(`/hr/payroll/${id}`)).data);

  const applySearch = () => setFilters((f) => ({ ...f, search: searchInput }));
  const clearFilters = () => {
    setSearchInput('');
    setFilters(emptyFilters);
  };

  const hasActiveFilters =
    filters.search || filters.status || filters.period || filters.from || filters.to;
  const stats = statsQuery.data;
  const runs = listQuery.data ?? [];
  const adjustments = adjustmentsQuery.data ?? [];
  const pendingAdjustments = adjustments.filter((a: { payRunId?: string | null }) => !a.payRunId);
  const runTotal = (r: { payslips?: { netPay: string | number }[] }) =>
    (r.payslips ?? []).reduce((a, p) => a + Number(p.netPay), 0);

  const breakdownLines: BreakdownLine[] = Array.isArray(viewPayslip?.breakdown)
    ? viewPayslip.breakdown
    : [];
  const allowanceLines = breakdownLines.filter((l) => l.type === 'ALLOWANCE');
  const deductionLines = breakdownLines.filter((l) => l.type === 'DEDUCTION');

  const handlePrintPayslip = () => {
    if (!viewPayslip || !viewRun || !branding.data) return;
    printPayslip(
      {
        payslip: {
          baseSalary: Number(viewPayslip.baseSalary),
          totalAllowances: Number(viewPayslip.totalAllowances),
          totalDeductions: Number(viewPayslip.totalDeductions),
          grossPay: Number(viewPayslip.grossPay),
          netPay: Number(viewPayslip.netPay),
          breakdown: viewPayslip.breakdown,
        },
        employee: viewPayslip.employee,
        payRun: {
          title: viewRun.title,
          period: viewRun.period,
          status: viewRun.status,
          runDate: viewRun.runDate,
        },
      },
      branding.data,
    );
  };

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ColorStatCard
          label="Pay runs"
          value={stats?.total ?? '—'}
          icon={<Receipt size={22} />}
          color="violet"
        />
        <ColorStatCard
          label="Draft"
          value={stats?.draft ?? '—'}
          hint="Not yet processed"
          icon={<FileText size={22} />}
          color="amber"
        />
        <ColorStatCard
          label="Processed"
          value={stats?.processed ?? '—'}
          icon={<Clock size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="Paid"
          value={stats?.paid ?? '—'}
          icon={<CheckCircle size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="Total net"
          value={formatCurrency(stats?.totalNet ?? 0)}
          hint="Filtered pay runs"
          icon={<Wallet size={22} />}
          color="indigo"
        />
        <ColorStatCard
          label="Payslips"
          value={stats?.totalPayslips ?? '—'}
          hint="Across filtered runs"
          icon={<Users size={22} />}
          color="rose"
        />
      </div>

      {hasPermission('payroll.payroll.manage') && (
        <Card className="mb-6 overflow-hidden">
          <div className="border-b border-slate-100 bg-gradient-to-r from-rose-50 to-amber-50 px-5 py-4">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <MinusCircle size={18} className="text-rose-600" />
              Period adjustments
            </h3>
            <p className="mt-0.5 text-sm text-slate-600">
              Record one-off allowances or deductions for a month before generating payroll. Deductions
              are posted as repayments when payroll is marked paid.
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
              <Input
                label="Period (YYYY-MM)"
                value={adjustmentPeriod}
                onChange={(e) => setAdjustmentPeriod(e.target.value)}
                placeholder="2026-06"
              />
              <EmployeeSelect
                label="Employee"
                branchId={branchId}
                value={adjForm.employeeId}
                onChange={(employeeId) => setAdjForm({ ...adjForm, employeeId })}
              />
              <Input
                label="Description"
                value={adjForm.name}
                onChange={(e) => setAdjForm({ ...adjForm, name: e.target.value })}
                placeholder="e.g. Loan repayment"
              />
              <Select
                label="Type"
                value={adjForm.type}
                onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value })}
              >
                <option value="DEDUCTION">Deduction</option>
                <option value="ALLOWANCE">Allowance</option>
              </Select>
              <Input
                label="Amount"
                type="number"
                min={0}
                step="0.01"
                value={adjForm.amount}
                onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  className="w-full"
                  disabled={
                    !adjForm.employeeId ||
                    !adjForm.name.trim() ||
                    !adjForm.amount ||
                    addAdjustment.isPending
                  }
                  loading={addAdjustment.isPending}
                  onClick={() => addAdjustment.mutate()}
                >
                  <Plus size={16} /> Add
                </Button>
              </div>
            </div>

            {pendingAdjustments.length > 0 && (
              <p className="text-sm text-slate-600">
                {pendingAdjustments.length} pending adjustment(s) for {adjustmentPeriod} will be
                included in the next pay run for this period.
              </p>
            )}

            <Table>
              <thead>
                <tr>
                  <SerialTh />
                  <Th>Employee</Th>
                  <Th>Description</Th>
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {adjustmentsQuery.isLoading && <EmptyRow colSpan={7} message="Loading…" />}
                {!adjustmentsQuery.isLoading && adjustments.length === 0 && (
                  <EmptyRow colSpan={7} message="No adjustments for this period." />
                )}
                {adjustments.map((a: any, i: number) => (
                  <tr key={a.id}>
                    <SerialTd index={i} />
                    <Td className="font-medium text-slate-900">
                      {a.employee.firstName} {a.employee.lastName}
                    </Td>
                    <Td>{a.name}</Td>
                    <Td>
                      <Badge tone={a.type === 'ALLOWANCE' ? 'green' : 'red'}>
                        {humanize(a.type)}
                      </Badge>
                    </Td>
                    <Td
                      className={`text-sm tabular-nums ${a.type === 'ALLOWANCE' ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {a.type === 'ALLOWANCE' ? '+' : '-'}
                      {formatCurrency(Number(a.amount))}
                    </Td>
                    <Td>
                      {a.payRun ? (
                        <Badge tone={STATUS_TONES[a.payRun.status] ?? 'gray'}>
                          {a.payRun.title}
                        </Badge>
                      ) : (
                        <Badge tone="amber">Pending</Badge>
                      )}
                    </Td>
                    <Td className="text-right">
                      {!a.payRunId && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Remove this adjustment?')) removeAdjustment.mutate(a.id);
                          }}
                          className="rounded p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-sm">
        <div className="border-b border-emerald-100/80 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <Filter size={18} /> Filters
          </h3>
          <p className="mt-0.5 text-sm text-white/85">Search pay runs, filter by status, period, or dates</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Search</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Title, period, notes…"
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
              {PAY_RUN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
            <Input
              label="Period (YYYY-MM)"
              value={filters.period}
              onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value }))}
              placeholder="2026-06"
            />
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
              {filters.period && <Badge tone="blue">{filters.period}</Badge>}
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
        {hasPermission('payroll.payroll.create') && (
          <Button
            onClick={() => {
              setForm({
                title: `Payroll ${thisMonth}`,
                period: thisMonth,
                notes: '',
              });
              setOpen(true);
            }}
          >
            <Plus size={16} /> New Pay Run
          </Button>
        )}
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <SerialTh />
              <Th>Title</Th>
              <Th>Period</Th>
              <Th>Branch</Th>
              <Th>Employees</Th>
              <Th>Total net</Th>
              <Th>Status</Th>
              <Th>Run date</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading && <EmptyRow colSpan={9} message="Loading…" />}
            {!listQuery.isLoading && runs.length === 0 && (
              <EmptyRow colSpan={9} message="No pay runs match your filters." />
            )}
            {runs.map((r: any, i: number) => (
              <tr key={r.id}>
                <SerialTd index={i} />
                <Td className="font-medium text-slate-900">{r.title}</Td>
                <Td>
                  <Badge tone="blue">{r.period}</Badge>
                </Td>
                <Td className="text-slate-500">{r.branch?.name ?? '—'}</Td>
                <Td>{r._count.payslips}</Td>
                <Td className="text-sm tabular-nums font-semibold text-emerald-700">
                  {formatCurrency(runTotal(r))}
                </Td>
                <Td>
                  <Badge tone={STATUS_TONES[r.status] ?? 'gray'}>{humanize(r.status)}</Badge>
                </Td>
                <Td className="text-slate-500">{formatDate(r.runDate)}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => openView(r.id)}
                      className="rounded p-1.5 text-violet-500 hover:bg-violet-50 hover:text-violet-700"
                      title="View payslips"
                    >
                      <Eye size={16} />
                    </button>
                    {hasPermission('payroll.payroll.delete') && r.status === 'DRAFT' && (
                      <button
                        onClick={() => {
                          if (confirm('Delete pay run?')) del.mutate(r.id);
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
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Pay Run">
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
          <Input
            label="Period (YYYY-MM)"
            value={form.period}
            onChange={(e) => setForm({ ...form, period: e.target.value })}
            required
          />
          <Input
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <p className="text-xs text-slate-500">
            All non-terminated employees in the branch will be included. When marked paid, base salary
            and allowances post as expenses; deductions post as repayments.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              Generate payslips
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewRun} onClose={() => setViewRun(null)} title={viewRun?.title ?? ''} size="xl">
        {viewRun && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-violet-50 p-3">
                <p className="text-xs text-violet-600">Period</p>
                <p className="font-bold text-violet-900">{viewRun.period}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs text-emerald-600">Employees</p>
                <p className="font-bold text-emerald-900">{viewRun.payslips?.length ?? 0}</p>
              </div>
              <div className="rounded-xl bg-sky-50 p-3">
                <p className="text-xs text-sky-600">Branch</p>
                <p className="font-bold text-sky-900">{viewRun.branch?.name ?? '—'}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-xs text-amber-600">Status</p>
                <Badge tone={STATUS_TONES[viewRun.status] ?? 'gray'}>{humanize(viewRun.status)}</Badge>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {hasPermission('payroll.payroll.manage') && (
                <>
                  {viewRun.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={recalculate.isPending}
                      onClick={() => recalculate.mutate(viewRun.id)}
                    >
                      <RefreshCw size={14} /> Recalculate
                    </Button>
                  )}
                  {viewRun.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus.mutate({ id: viewRun.id, status: 'PROCESSED' })}
                    >
                      Mark Processed
                    </Button>
                  )}
                  {viewRun.status !== 'PAID' && (
                    <Button size="sm" onClick={() => setStatus.mutate({ id: viewRun.id, status: 'PAID' })}>
                      Mark Paid
                    </Button>
                  )}
                </>
              )}
            </div>

            <Card>
              <Table>
                <thead>
                  <tr>
                    <SerialTh />
                    <Th>Employee</Th>
                    <Th>Base</Th>
                    <Th>Allowances</Th>
                    <Th>Deductions</Th>
                    <Th>Net pay</Th>
                  </tr>
                </thead>
                <tbody>
                  {viewRun.payslips.map((p: any, i: number) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setViewPayslip(p)}
                    >
                      <SerialTd index={i} />
                      <Td className="font-medium text-slate-900">
                        {p.employee.firstName} {p.employee.lastName}
                        <span className="ml-2 text-xs text-slate-400">{p.employee.employeeNumber}</span>
                      </Td>
                      <Td className="text-sm tabular-nums">{formatCurrency(Number(p.baseSalary))}</Td>
                      <Td className="text-sm tabular-nums text-emerald-600">
                        +{formatCurrency(Number(p.totalAllowances))}
                      </Td>
                      <Td className="text-sm tabular-nums text-rose-600">
                        -{formatCurrency(Number(p.totalDeductions))}
                      </Td>
                      <Td className="text-sm tabular-nums font-semibold text-emerald-700">
                        {formatCurrency(Number(p.netPay))}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>

            <p className="text-xs text-slate-500">
              Click an employee row to view allowance/deduction details and linked finance records.
            </p>

            <div className="flex justify-end rounded-xl bg-gradient-to-r from-violet-50 to-emerald-50 p-4">
              <span className="font-semibold text-slate-900">
                Total net:{' '}
                {formatCurrency(
                  viewRun.payslips.reduce((a: number, p: any) => a + Number(p.netPay), 0),
                )}
              </span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!viewPayslip}
        onClose={() => setViewPayslip(null)}
        title={
          viewPayslip
            ? `${viewPayslip.employee.firstName} ${viewPayslip.employee.lastName} — Payslip`
            : ''
        }
        size="lg"
      >
        {viewPayslip && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Base salary</p>
                <p className="text-sm tabular-nums font-bold text-slate-900">
                  {formatCurrency(Number(viewPayslip.baseSalary))}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs text-emerald-600">Allowances</p>
                <p className="text-sm tabular-nums font-bold text-emerald-700">
                  +{formatCurrency(Number(viewPayslip.totalAllowances))}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3">
                <p className="text-xs text-rose-600">Deductions</p>
                <p className="text-sm tabular-nums font-bold text-rose-700">
                  -{formatCurrency(Number(viewPayslip.totalDeductions))}
                </p>
              </div>
              <div className="rounded-xl bg-violet-50 p-3">
                <p className="text-xs text-violet-600">Net pay</p>
                <p className="text-sm tabular-nums font-bold text-violet-900">
                  {formatCurrency(Number(viewPayslip.netPay))}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-emerald-700">Allowances</h4>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40">
                  {allowanceLines.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">No allowances.</p>
                  ) : (
                    <ul className="divide-y divide-emerald-100">
                      {allowanceLines.map((line, idx) => (
                        <li key={idx} className="flex items-center justify-between px-4 py-3 text-sm">
                          <div>
                            <p className="font-medium text-slate-900">{line.name}</p>
                            <p className="text-xs text-slate-500">
                              {line.source === 'period' ? 'Period adjustment' : 'Salary component'}
                              {line.isPercentage ? ` · ${line.amount}%` : ''}
                            </p>
                          </div>
                          <span className="tabular-nums font-semibold text-emerald-700">
                            +{formatCurrency(line.isPercentage ? (Number(viewPayslip.baseSalary) * line.amount) / 100 : line.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-rose-700">Deductions</h4>
                <div className="rounded-xl border border-rose-100 bg-rose-50/40">
                  {deductionLines.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">No deductions.</p>
                  ) : (
                    <ul className="divide-y divide-rose-100">
                      {deductionLines.map((line, idx) => (
                        <li key={idx} className="flex items-center justify-between px-4 py-3 text-sm">
                          <div>
                            <p className="font-medium text-slate-900">{line.name}</p>
                            <p className="text-xs text-slate-500">
                              {line.source === 'period' ? 'Period adjustment' : 'Salary component'}
                              {line.isPercentage ? ` · ${line.amount}%` : ''}
                              {line.type === 'DEDUCTION' ? ' · Repayment when paid' : ''}
                            </p>
                          </div>
                          <span className="tabular-nums font-semibold text-rose-700">
                            -{formatCurrency(line.isPercentage ? (Number(viewPayslip.baseSalary) * line.amount) / 100 : line.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {(viewPayslip.expense || viewPayslip.contributions?.length > 0) && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-800">Finance records</h4>
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm">
                  {viewPayslip.expense && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Salary expense (base + allowances)</span>
                      <span className="font-semibold text-rose-700">
                        {formatCurrency(Number(viewPayslip.expense.amount))}
                      </span>
                    </div>
                  )}
                  {viewPayslip.contributions?.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between">
                      <span className="text-slate-600">
                        Repayment · {c.givingType?.name ?? c.payrollDeduction}
                      </span>
                      <span className="font-semibold text-emerald-700">
                        +{formatCurrency(Number(c.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setViewPayslip(null)}>
                Close
              </Button>
              <Button onClick={handlePrintPayslip} disabled={!branding.data}>
                <Printer size={16} /> Print payslip
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
