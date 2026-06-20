'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, HandCoins, Receipt, CalendarRange, TrendingUp, Tag, Eye } from 'lucide-react';
import { api, downloadExport } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDefaultBranchId, useGivingTypes, useFunds, useDefaultFundId } from '@/lib/hooks';
import { Card, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { PAYMENT_METHODS, humanize } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FinanceDateRangeFilter, type DateRangeValue } from '@/components/finance/FinanceDateRangeFilter';
import { MemberSelect } from '@/components/members/MemberSelect';
import { IncomeDetailModal, type IncomeRecord } from '@/components/finance/IncomeDetailModal';

const TYPE_BADGE_TONES = ['blue', 'brand', 'green', 'amber', 'red'] as const;

export function ContributionsTab() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branchId = useDefaultBranchId();
  const givingTypes = useGivingTypes(branchId);
  const funds = useFunds(branchId);
  const defaultFundId = useDefaultFundId(branchId);
  const [search, setSearch] = useState('');
  const [givingTypeId, setGivingTypeId] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<IncomeRecord | null>(null);

  const defaultTypeId = givingTypes.data?.[0]?.id ?? '';

  const blank = {
    branchId,
    givingTypeId: defaultTypeId,
    amount: '',
    contributedAt: new Date().toISOString().slice(0, 10),
    paymentMethod: 'CASH',
    fundId: '',
    memberId: '',
    reference: '',
    note: '',
  };
  const [form, setForm] = useState(blank);

  const listQuery = useQuery({
    queryKey: ['contributions', { search, givingTypeId, page, branchId, dateRange }],
    queryFn: async () =>
      (
        await api.get('/finance/contributions', {
          params: {
            search,
            givingTypeId: givingTypeId || undefined,
            page,
            pageSize: 15,
            branchId,
            from: dateRange.from || undefined,
            to: dateRange.to || undefined,
          },
        })
      ).data,
  });

  const statsQuery = useQuery({
    queryKey: ['contributions-stats', { search, givingTypeId, branchId, dateRange }],
    queryFn: async () =>
      (
        await api.get('/finance/contributions/stats', {
          params: {
            search,
            givingTypeId: givingTypeId || undefined,
            branchId,
            from: dateRange.from || undefined,
            to: dateRange.to || undefined,
          },
        })
      ).data,
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        ...form,
        amount: Number(form.amount),
        branchId: branchId || form.branchId,
      };
      if (!payload.memberId) delete payload.memberId;
      if (!payload.fundId) delete payload.fundId;
      return api.post('/finance/contributions', payload);
    },
    meta: { successMessage: 'Income recorded', errorMessage: 'Failed to save income' },
    onSuccess: () => {
      ['contributions', 'contributions-stats', 'finance-summary', 'funds', 'funds-stats'].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
      setOpen(false);
    },
  });

  const rows = listQuery.data?.data ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;
  const stats = statsQuery.data;

  const openForm = () => {
    setForm({
      ...blank,
      givingTypeId: givingTypes.data?.[0]?.id ?? '',
      fundId: defaultFundId,
    });
    setOpen(true);
  };

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <ColorStatCard
          label="Total raised"
          value={formatCurrency(stats?.totalAmount ?? 0)}
          hint={`${stats?.total ?? 0} records`}
          icon={<HandCoins size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="This month"
          value={formatCurrency(stats?.monthAmount ?? 0)}
          hint={`${stats?.monthCount ?? 0} this month`}
          icon={<CalendarRange size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="Average gift"
          value={formatCurrency(stats?.averageAmount ?? 0)}
          hint="Per entry"
          icon={<TrendingUp size={22} />}
          color="violet"
        />
        <ColorStatCard
          label="Records"
          value={stats?.total ?? 0}
          hint="Matching filters"
          icon={<Receipt size={22} />}
          color="indigo"
        />
        <ColorStatCard
          label="Giving types"
          value={stats?.givingTypes ?? 0}
          hint="Registered types"
          icon={<Tag size={22} />}
          color="amber"
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid w-full flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)] xl:grid-cols-[minmax(0,3fr)_minmax(16rem,20rem)]">
          <div className="relative min-w-0">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="py-2.5 pl-10"
              placeholder="Search receipt, member, reference, note…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            className="py-2.5"
            value={givingTypeId}
            onChange={(e) => {
              setGivingTypeId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            {givingTypes.data?.map((t: { id: string; name: string }) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        {hasPermission('finance.contribution.create') && (
          <Button onClick={openForm} disabled={!givingTypes.data?.length}>
            <Plus size={16} /> Record Income
          </Button>
        )}
      </div>

      <div className="mb-4">
        <FinanceDateRangeFilter
          value={dateRange}
          onChange={(next) => {
            setDateRange(next);
            setPage(1);
          }}
        />
      </div>

      {listQuery.data && (
        <p className="mb-3 text-sm text-slate-500">
          Total:{' '}
          <span className="font-semibold text-slate-900">
            {formatCurrency(listQuery.data.totalAmount ?? 0)}
          </span>{' '}
          across {listQuery.data.total} record(s)
        </p>
      )}

      <Card>
        <Table>
          <thead>
            <tr>
              <SerialTh />
              <Th>Receipt</Th>
              <Th>Date</Th>
              <Th>Member</Th>
              <Th>Type</Th>
              <Th>Method</Th>
              <Th>Source</Th>
              <Th>Amount</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading && <EmptyRow colSpan={9} message="Loading…" />}
            {!listQuery.isLoading && rows.length === 0 && (
              <EmptyRow colSpan={9} message="No income recorded yet." />
            )}
            {rows.map((c: IncomeRecord, i: number) => (
              <tr
                key={c.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => setViewRecord(c)}
              >
                <SerialTd page={page} pageSize={15} index={i} />
                <Td className="font-mono text-xs">{c.receiptNumber}</Td>
                <Td>{formatDate(c.contributedAt)}</Td>
                <Td>
                  {c.member ? (
                    `${c.member.firstName} ${c.member.lastName}`
                  ) : c.donorName ? (
                    c.donorName
                  ) : (
                    <span className="text-slate-400">Anonymous</span>
                  )}
                </Td>
                <Td>
                  <Badge tone={TYPE_BADGE_TONES[i % TYPE_BADGE_TONES.length]}>
                    {c.givingType?.name ?? '—'}
                  </Badge>
                </Td>
                <Td className="text-slate-500">{humanize(c.paymentMethod)}</Td>
                <Td>
                  {c.payslipId ? (
                    <Badge tone="violet">Payroll repayment</Badge>
                  ) : c.givingType?.name === 'Online Giving' || c.paymentMethod === 'ONLINE' ? (
                    <Badge tone="green">Online giving</Badge>
                  ) : c.pledgeId ? (
                    <Badge tone="blue">Pledge{c.pledge?.campaign ? `: ${c.pledge.campaign}` : ''}</Badge>
                  ) : (
                    <span className="text-slate-400">Manual</span>
                  )}
                </Td>
                <Td className="font-semibold text-emerald-700">
                  {formatCurrency(Number(c.amount))}
                </Td>
                <Td className="text-right">
                  {hasPermission('finance.contribution.view') && (
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="View details"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewRecord(c);
                        }}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        title="Download receipt"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadExport(
                            `/finance/contributions/${c.id}/receipt`,
                            `receipt-${c.receiptNumber ?? c.id}.pdf`,
                          );
                        }}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span>
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Record Income" size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Income type"
              value={form.givingTypeId}
              onChange={(e) => setForm({ ...form, givingTypeId: e.target.value })}
              required
            >
              {givingTypes.data?.map((t: { id: string; name: string }) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min={0}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
            <Input
              label="Date"
              type="date"
              value={form.contributedAt}
              onChange={(e) => setForm({ ...form, contributedAt: e.target.value })}
              required
            />
            <Select
              label="Payment method"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {humanize(m)}
                </option>
              ))}
            </Select>
            <Select
              label="Account"
              value={form.fundId}
              onChange={(e) => setForm({ ...form, fundId: e.target.value })}
            >
              {funds.data?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.currency}){f.isDefault ? ' — Default' : ''}
                </option>
              ))}
            </Select>
            <MemberSelect
              label="Member (optional)"
              branchId={branchId}
              value={form.memberId}
              onChange={(memberId) => setForm({ ...form, memberId })}
            />
          </div>
          <Input
            label="Reference (optional)"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
          />
          <Input
            label="Note (optional)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <IncomeDetailModal
        record={viewRecord}
        onClose={() => setViewRecord(null)}
        canDownload={hasPermission('finance.contribution.view')}
      />
    </div>
  );
}
