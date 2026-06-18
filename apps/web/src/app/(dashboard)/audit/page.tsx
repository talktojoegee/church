'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ScrollText,
  Search,
  Shield,
  LogIn,
  Filter,
  Wallet,
  Eye,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { AuditDetailModal, type AuditRecord } from '@/components/audit/AuditDetailModal';
import { formatDate, cn } from '@/lib/utils';

const ACTION_TONES: Record<string, 'green' | 'red' | 'blue' | 'amber' | 'brand' | 'gray'> = {
  'auth.login': 'blue',
  'auth.logout': 'gray',
  'access.user.create': 'green',
  'access.user.update': 'amber',
  'access.user.delete': 'red',
  'access.role.create': 'green',
  'access.role.update': 'amber',
  'access.role.delete': 'red',
  'org.setting.update': 'brand',
  'finance.contribution.create': 'green',
  'finance.contribution.update': 'amber',
  'finance.contribution.delete': 'red',
  'finance.expense.create': 'red',
  'finance.expense.update': 'amber',
  'finance.expense.delete': 'red',
  'finance.pledge.create': 'blue',
  'finance.pledge.update': 'blue',
  'membership.member.create': 'green',
  'membership.member.update': 'amber',
  'membership.member.delete': 'red',
};

const MODULE_TONES: Record<string, 'green' | 'red' | 'blue' | 'amber' | 'brand' | 'gray'> = {
  auth: 'blue',
  access: 'amber',
  org: 'brand',
  membership: 'green',
  engagement: 'blue',
  content: 'blue',
  finance: 'green',
  hr: 'amber',
  payroll: 'amber',
  comms: 'blue',
};

function actionTone(action: string): 'green' | 'red' | 'blue' | 'amber' | 'brand' | 'gray' {
  if (ACTION_TONES[action]) return ACTION_TONES[action];
  const module = action.split('.')[0] ?? '';
  if (MODULE_TONES[module]) return MODULE_TONES[module];
  if (action.includes('.delete')) return 'red';
  if (action.includes('.create')) return 'green';
  if (action.includes('.update')) return 'amber';
  return 'gray';
}

function humanizeAction(action: string) {
  return action
    .split('.')
    .map((p) => p.replace(/_/g, ' '))
    .join(' · ');
}

export default function AuditPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [viewRecord, setViewRecord] = useState<AuditRecord | null>(null);

  const auditQuery = useQuery({
    queryKey: ['audit', search, actionFilter, from, to, page],
    queryFn: async () =>
      (
        await api.get('/audit', {
          params: {
            page,
            pageSize: 30,
            search: search || undefined,
            action: actionFilter || undefined,
            from: from || undefined,
            to: to || undefined,
          },
        })
      ).data,
  });

  const rows = auditQuery.data?.data ?? [];
  const total = auditQuery.data?.total ?? 0;
  const totalPages = auditQuery.data?.totalPages ?? 1;

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = rows.filter((r: any) => new Date(r.createdAt) >= today).length;
    const logins = rows.filter((r: any) => r.action.startsWith('auth.')).length;
    const userChanges = rows.filter((r: any) => r.action.startsWith('access.')).length;
    const membershipChanges = rows.filter((r: any) => r.action.startsWith('membership.')).length;
    const financeChanges = rows.filter((r: any) => r.action.startsWith('finance.')).length;
    return { total, todayCount, logins, userChanges, membershipChanges, financeChanges };
  }, [rows, total]);

  const quickFilters = [
    { id: '', label: 'All actions' },
    { id: 'auth.', label: 'Auth' },
    { id: 'access.', label: 'Access' },
    { id: 'org.', label: 'Organization' },
    { id: 'membership.', label: 'Membership' },
    { id: 'engagement.', label: 'Engagement' },
    { id: 'content.', label: 'Content' },
    { id: 'finance.', label: 'Finance' },
    { id: 'hr.', label: 'HR' },
    { id: 'payroll.', label: 'Payroll' },
    { id: 'comms.', label: 'Communications' },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        description="System activity log — who did what and when."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <ColorStatCard label="Total events" value={stats.total} icon={<ScrollText size={22} />} color="violet" />
        <ColorStatCard label="On this page" value={rows.length} hint="Current results" icon={<Filter size={22} />} color="blue" />
        <ColorStatCard label="Auth events" value={stats.logins} hint="Login & logout" icon={<LogIn size={22} />} color="emerald" />
        <ColorStatCard label="Finance" value={stats.financeChanges} hint="In current view" icon={<Wallet size={22} />} color="emerald" />
        <ColorStatCard label="Membership" value={stats.membershipChanges} icon={<Users size={22} />} color="amber" />
        <ColorStatCard label="Access control" value={stats.userChanges} icon={<Shield size={22} />} color="indigo" />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Search"
            placeholder="User, action, entity…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setSearch(searchInput), setPage(1))}
            className="py-2.5"
          />
        </div>
        <div>
          <Input label="From" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="py-2.5" />
        </div>
        <div>
          <Input label="To" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="py-2.5" />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setSearch(searchInput);
            setPage(1);
          }}
        >
          <Search size={16} /> Search
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {quickFilters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setActionFilter(f.id);
              setPage(1);
            }}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition',
              actionFilter === f.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <thead>
            <tr>
              <SerialTh />
              <Th>When</Th>
              <Th>User</Th>
              <Th>Action</Th>
              <Th>Entity</Th>
              <Th>Summary</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {auditQuery.isLoading && <EmptyRow colSpan={7} message="Loading audit log…" />}
            {!auditQuery.isLoading && rows.length === 0 && (
              <EmptyRow colSpan={7} message="No audit events found." />
            )}
            {rows.map((row: AuditRecord, i: number) => (
              <tr
                key={row.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => setViewRecord(row)}
              >
                <SerialTd index={(page - 1) * 30 + i} />
                <Td className="whitespace-nowrap text-slate-500">{formatDate(row.createdAt, true)}</Td>
                <Td>
                  {row.user ? (
                    <div>
                      <p className="font-medium text-slate-900">
                        {row.user.firstName} {row.user.lastName}
                      </p>
                      <p className="text-xs text-slate-400">{row.user.email}</p>
                    </div>
                  ) : (
                    <span className="text-slate-400">System</span>
                  )}
                </Td>
                <Td>
                  <Badge tone={actionTone(row.action)}>{humanizeAction(row.action)}</Badge>
                </Td>
                <Td className="text-sm text-slate-600">
                  {row.entityType ? (
                    <>
                      <span className="capitalize">{row.entityType}</span>
                      {row.entityId && (
                        <span className="block truncate font-mono text-xs text-slate-400">{row.entityId.slice(0, 12)}…</span>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="max-w-xs truncate text-xs text-slate-500">
                  {row.metadata && typeof row.metadata === 'object' && 'amount' in row.metadata
                    ? `Amount: ${row.metadata.amount}`
                    : row.metadata
                      ? Object.values(row.metadata).slice(0, 2).join(' · ')
                      : row.ipAddress ?? '—'}
                </Td>
                <Td className="text-right">
                  <button
                    type="button"
                    title="View details"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewRecord(row);
                    }}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                  >
                    <Eye size={16} />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages} · {total} events
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <AuditDetailModal
        record={viewRecord}
        onClose={() => setViewRecord(null)}
        actionTone={actionTone}
      />
    </div>
  );
}
