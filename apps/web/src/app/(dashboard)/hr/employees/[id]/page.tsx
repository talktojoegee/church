'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Briefcase,
  CalendarDays,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plane,
  Plus,
  Check,
  X,
  Pencil,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Hash,
  Printer,
  UserCircle,
} from 'lucide-react';
import { api, downloadExport } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useChurchBranding } from '@/lib/hooks';
import { printPayslip } from '@/lib/print-payslip';
import { Card, CardBody, CardHeader, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { MemberAvatar, memberHeroGradient } from '@/components/members/MemberAvatar';
import {
  EMPLOYEE_STATUS_TONES,
  LEAVE_STATUS_TONES,
  LEAVE_TYPES,
  humanize,
} from '@/lib/constants';
import { formatCurrency, formatDate, countWorkingDays, cn } from '@/lib/utils';

const PAGE_TABS = [
  { id: 'profile', label: 'Profile & Payroll' },
  { id: 'leave', label: 'Leave' },
];

function InfoTile({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color: string;
}) {
  return (
    <div className={cn('rounded-xl p-4 shadow-sm', color)}>
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/60 shadow-sm">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-base font-bold leading-snug">{value}</p>
    </div>
  );
}

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branding = useChurchBranding();
  const [tab, setTab] = useState('profile');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const leaveBlank = { type: 'ANNUAL', startDate: '', endDate: '', days: 0, reason: '' };
  const [leaveForm, setLeaveForm] = useState(leaveBlank);

  const employeeQuery = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => (await api.get(`/hr/employees/${id}`)).data,
  });

  const leaveStatsQuery = useQuery({
    queryKey: ['leave-stats', { employeeId: id }],
    queryFn: async () => (await api.get('/hr/leave/stats', { params: { employeeId: id } })).data,
    enabled: tab === 'leave',
  });

  const createLeave = useMutation({
    mutationFn: () =>
      api.post('/hr/leave', { ...leaveForm, employeeId: id, days: Number(leaveForm.days) }),
    meta: { successMessage: 'Leave request submitted', errorMessage: 'Failed to submit leave' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      qc.invalidateQueries({ queryKey: ['leave'] });
      qc.invalidateQueries({ queryKey: ['leave-stats'] });
      qc.invalidateQueries({ queryKey: ['hr-stats'] });
      setLeaveOpen(false);
    },
  });

  const reviewLeave = useMutation({
    mutationFn: ({ leaveId, status }: { leaveId: string; status: string }) =>
      api.patch(`/hr/leave/${leaveId}/review`, { status }),
    meta: { successMessage: 'Leave updated', errorMessage: 'Failed to update leave' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      qc.invalidateQueries({ queryKey: ['leave'] });
      qc.invalidateQueries({ queryKey: ['leave-stats'] });
      qc.invalidateQueries({ queryKey: ['hr-stats'] });
    },
  });

  if (employeeQuery.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;

  const e = employeeQuery.data;
  if (!e) return <p className="text-sm text-slate-500">Employee not found.</p>;

  const computed = e.computed ?? {};
  const gradient = memberHeroGradient(e.firstName, e.lastName);

  const handlePrintPayslip = (p: {
    baseSalary: number;
    totalAllowances: number;
    totalDeductions: number;
    grossPay: number;
    netPay: number;
    breakdown?: unknown;
    payRun: { title: string; period: string; status?: string; runDate?: string };
  }) => {
    if (!branding.data) return;
    printPayslip(
      {
        payslip: {
          baseSalary: Number(p.baseSalary),
          totalAllowances: Number(p.totalAllowances),
          totalDeductions: Number(p.totalDeductions),
          grossPay: Number(p.grossPay),
          netPay: Number(p.netPay),
          breakdown: Array.isArray(p.breakdown) ? p.breakdown : [],
        },
        employee: {
          firstName: e.firstName,
          lastName: e.lastName,
          employeeNumber: e.employeeNumber,
          position: e.position,
          department: e.department,
          email: e.email,
          phone: e.phone,
          employmentType: e.employmentType,
          hireDate: e.hireDate,
          bankName: e.bankName,
          bankAccountNo: e.bankAccountNo,
          bankAccountName: e.bankAccountName,
          branch: e.branch,
        },
        payRun: p.payRun,
      },
      branding.data,
    );
  };

  return (
    <div>
      <Link
        href="/hr"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> Back to HR
      </Link>

      <div
        className={cn(
          'relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-lg',
          gradient,
        )}
      >
        <div className="relative flex flex-wrap items-start gap-5">
          <MemberAvatar
            firstName={e.firstName}
            lastName={e.lastName}
            size="lg"
            className="ring-4 ring-white/30"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone={EMPLOYEE_STATUS_TONES[e.status] ?? 'gray'}>{humanize(e.status)}</Badge>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                {e.employeeNumber}
              </span>
            </div>
            <h1 className="text-2xl font-bold">
              {e.firstName} {e.lastName}
            </h1>
            <p className="mt-1 text-white/85">{e.position ?? 'Staff member'}</p>
            <p className="mt-0.5 text-sm text-white/70">
              {e.branch?.name} · {humanize(e.employmentType)}
            </p>
            {e.user && (
              <p className="mt-2 text-sm text-white/80">
                Linked login: <span className="font-medium">{e.user.email}</span>
              </p>
            )}
          </div>
          {hasPermission('hr.employee.update') && (
            <Link href="/hr">
              <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                <Pencil size={15} /> Edit on list
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} />

      {tab === 'profile' && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ColorStatCard
              label="Base salary"
              value={formatCurrency(computed.baseSalary ?? Number(e.baseSalary))}
              icon={<Wallet size={22} />}
              color="violet"
            />
            <ColorStatCard
              label="Gross pay"
              value={formatCurrency(computed.grossPay ?? 0)}
              hint="Base + allowances"
              icon={<TrendingUp size={22} />}
              color="emerald"
            />
            <ColorStatCard
              label="Deductions"
              value={formatCurrency(computed.totalDeductions ?? 0)}
              icon={<TrendingDown size={22} />}
              color="rose"
            />
            <ColorStatCard
              label="Net pay"
              value={formatCurrency(computed.netPay ?? 0)}
              hint="Take-home estimate"
              icon={<Receipt size={22} />}
              color="blue"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoTile
              icon={<UserCircle size={18} className="text-indigo-600" />}
              label="Login account"
              value={
                e.user ? (
                  <Link href="/users" className="text-violet-700 hover:underline">
                    {e.user.email}
                  </Link>
                ) : (
                  'Not linked'
                )
              }
              color="bg-indigo-50 text-indigo-900"
            />
            <InfoTile
              icon={<Mail size={18} className="text-violet-600" />}
              label="Email"
              value={e.email ?? '—'}
              color="bg-violet-50 text-violet-900"
            />
            <InfoTile
              icon={<Phone size={18} className="text-emerald-600" />}
              label="Phone"
              value={e.phone ?? '—'}
              color="bg-emerald-50 text-emerald-900"
            />
            <InfoTile
              icon={<Building2 size={18} className="text-sky-600" />}
              label="Branch"
              value={e.branch?.name ?? '—'}
              color="bg-sky-50 text-sky-900"
            />
            <InfoTile
              icon={<Briefcase size={18} className="text-amber-600" />}
              label="Department"
              value={e.department ?? '—'}
              color="bg-amber-50 text-amber-900"
            />
            <InfoTile
              icon={<CalendarDays size={18} className="text-indigo-600" />}
              label="Hire date"
              value={formatDate(e.hireDate)}
              color="bg-indigo-50 text-indigo-900"
            />
            <InfoTile
              icon={<CreditCard size={18} className="text-rose-600" />}
              label="Bank"
              value={
                e.bankName
                  ? `${e.bankName}${e.bankAccountNo ? ` · ${e.bankAccountNo}` : ''}`
                  : '—'
              }
              color="bg-rose-50 text-rose-900"
            />
          </div>

          {e.notes && (
            <Card>
              <CardHeader title="Notes" />
              <CardBody>
                <p className="text-sm text-slate-600">{e.notes}</p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Salary components" description="Allowances and deductions applied to base pay" />
            <CardBody className="p-0">
              <Table>
                <thead>
                  <tr>
                    <SerialTh />
                    <Th>Name</Th>
                    <Th>Type</Th>
                    <Th>Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {e.components?.length === 0 && (
                    <EmptyRow colSpan={4} message="No salary components configured." />
                  )}
                  {e.components?.map((c: { id: string; name: string; type: string; amount: string; isPercentage: boolean }, i: number) => (
                    <tr key={c.id}>
                      <SerialTd index={i} />
                      <Td className="font-medium text-slate-900">{c.name}</Td>
                      <Td>
                        <Badge tone={c.type === 'ALLOWANCE' ? 'green' : 'red'}>{humanize(c.type)}</Badge>
                      </Td>
                      <Td>
                        {c.isPercentage
                          ? `${Number(c.amount)}% of base`
                          : formatCurrency(Number(c.amount))}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Payroll log"
              description="Payslip history from pay runs — export to Excel to expand component breakdown"
              action={
                e.payslips?.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadExport(
                        `/hr/employees/${id}/payroll-export`,
                        `payroll-log-${e.employeeNumber}.xlsx`,
                      )
                    }
                  >
                    <Download size={16} /> Export Excel
                  </Button>
                ) : undefined
              }
            />
            <CardBody className="p-0">
              <Table>
                <thead>
                  <tr>
                    <SerialTh />
                    <Th>Period</Th>
                    <Th>Pay run</Th>
                    <Th>Status</Th>
                    <Th>Gross</Th>
                    <Th>Net pay</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {!e.payslips?.length && (
                    <EmptyRow colSpan={7} message="No payslips yet — run payroll to generate records." />
                  )}
                  {e.payslips?.map((p: {
                    id: string;
                    baseSalary: number;
                    totalAllowances: number;
                    totalDeductions: number;
                    grossPay: number;
                    netPay: number;
                    breakdown?: unknown;
                    payRun: { title: string; period: string; status: string; runDate?: string };
                  }, i: number) => (
                    <tr key={p.id}>
                      <SerialTd index={i} />
                      <Td className="font-medium">{p.payRun?.period ?? '—'}</Td>
                      <Td className="text-slate-600">{p.payRun?.title ?? '—'}</Td>
                      <Td>
                        <Badge tone={p.payRun?.status === 'PAID' ? 'green' : 'amber'}>
                          {humanize(p.payRun?.status ?? 'DRAFT')}
                        </Badge>
                      </Td>
                      <Td>{formatCurrency(p.grossPay)}</Td>
                      <Td className="font-semibold text-emerald-700">{formatCurrency(p.netPay)}</Td>
                      <Td className="text-right">
                        <button
                          type="button"
                          onClick={() => handlePrintPayslip(p)}
                          disabled={!branding.data}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-50"
                          title="Print payslip"
                        >
                          <Printer size={15} /> Print
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'leave' && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <ColorStatCard
              label="Total requests"
              value={leaveStatsQuery.data?.total ?? '—'}
              icon={<CalendarDays size={22} />}
              color="violet"
            />
            <ColorStatCard
              label="Pending"
              value={leaveStatsQuery.data?.pending ?? '—'}
              hint="Awaiting review"
              icon={<Clock size={22} />}
              color="amber"
            />
            <ColorStatCard
              label="Approved"
              value={leaveStatsQuery.data?.approved ?? '—'}
              icon={<CheckCircle size={22} />}
              color="emerald"
            />
            <ColorStatCard
              label="Rejected"
              value={leaveStatsQuery.data?.rejected ?? '—'}
              icon={<XCircle size={22} />}
              color="rose"
            />
            <ColorStatCard
              label="Total days"
              value={leaveStatsQuery.data?.totalDays ?? '—'}
              hint="Across all requests"
              icon={<Plane size={22} />}
              color="blue"
            />
            <ColorStatCard
              label="This month"
              value={leaveStatsQuery.data?.thisMonth ?? '—'}
              hint="New requests"
              icon={<Hash size={22} />}
              color="indigo"
            />
          </div>

          <div className="flex justify-end">
            {hasPermission('hr.leave.create') && (
              <Button
                onClick={() => {
                  setLeaveForm(leaveBlank);
                  setLeaveOpen(true);
                }}
              >
                <Plus size={16} /> Request leave
              </Button>
            )}
          </div>

          <Card>
            <CardHeader title="Leave history" />
            <CardBody className="p-0">
              <Table>
                <thead>
                  <tr>
                    <SerialTh />
                    <Th>Type</Th>
                    <Th>Period</Th>
                    <Th>Days</Th>
                    <Th>Status</Th>
                    <Th>Reason</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {!e.leaves?.length && <EmptyRow colSpan={7} message="No leave requests." />}
                  {e.leaves?.map((l: {
                    id: string;
                    type: string;
                    startDate: string;
                    endDate: string;
                    days: number;
                    status: string;
                    reason: string | null;
                  }, i: number) => (
                    <tr key={l.id}>
                      <SerialTd index={i} />
                      <Td>
                        <Badge tone="blue">{humanize(l.type)}</Badge>
                      </Td>
                      <Td className="text-slate-600">
                        {formatDate(l.startDate)} – {formatDate(l.endDate)}
                      </Td>
                      <Td>{l.days}</Td>
                      <Td>
                        <Badge tone={LEAVE_STATUS_TONES[l.status] ?? 'gray'}>{humanize(l.status)}</Badge>
                      </Td>
                      <Td className="max-w-xs truncate text-slate-500">{l.reason ?? '—'}</Td>
                      <Td className="text-right">
                        {hasPermission('hr.leave.manage') && l.status === 'PENDING' && (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => reviewLeave.mutate({ leaveId: l.id, status: 'APPROVED' })}
                              className="rounded p-1.5 text-emerald-500 hover:bg-emerald-50"
                              title="Approve"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => reviewLeave.mutate({ leaveId: l.id, status: 'REJECTED' })}
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
            </CardBody>
          </Card>
        </div>
      )}

      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Request Leave" size="lg">
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            createLeave.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={leaveForm.type}
              onChange={(ev) => setLeaveForm({ ...leaveForm, type: ev.target.value })}
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
              value={leaveForm.days || ''}
              readOnly
              disabled
              className="cursor-not-allowed bg-slate-50"
              placeholder="Select dates"
            />
            <Input
              label="Start date"
              type="date"
              value={leaveForm.startDate}
              onChange={(ev) => {
                const startDate = ev.target.value;
                setLeaveForm({
                  ...leaveForm,
                  startDate,
                  days: countWorkingDays(startDate, leaveForm.endDate),
                });
              }}
              required
            />
            <Input
              label="End date"
              type="date"
              value={leaveForm.endDate}
              onChange={(ev) => {
                const endDate = ev.target.value;
                setLeaveForm({
                  ...leaveForm,
                  endDate,
                  days: countWorkingDays(leaveForm.startDate, endDate),
                });
              }}
              required
            />
          </div>
          <Input
            label="Reason"
            value={leaveForm.reason}
            onChange={(ev) => setLeaveForm({ ...leaveForm, reason: ev.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createLeave.isPending} disabled={leaveForm.days < 1}>
              Submit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
