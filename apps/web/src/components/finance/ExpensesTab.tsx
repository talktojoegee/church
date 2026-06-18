'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Receipt, CalendarRange, TrendingDown, FolderOpen, Hash, Eye, Download } from 'lucide-react';
import { api, downloadExport } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDefaultBranchId, useExpenseCategories, useFunds, useDefaultFundId } from '@/lib/hooks';
import { Card, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { PAYMENT_METHODS, humanize } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FinanceDateRangeFilter, type DateRangeValue } from '@/components/finance/FinanceDateRangeFilter';
import { ExpenseDetailModal, type ExpenseRecord } from '@/components/finance/ExpenseDetailModal';

const CAT_BADGE_TONES = ['red', 'amber', 'brand', 'blue', 'green'] as const;

export function ExpensesTab() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branchId = useDefaultBranchId();
  const categories = useExpenseCategories(branchId);
  const funds = useFunds(branchId);
  const defaultFundId = useDefaultFundId(branchId);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<ExpenseRecord | null>(null);

  const blank = {
    branchId,
    categoryId: categories.data?.[0]?.id ?? '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'CASH',
    fundId: '',
    paidTo: '',
    reference: '',
    description: '',
  };
  const [form, setForm] = useState(blank);

  const listQuery = useQuery({
    queryKey: ['expenses', { search, categoryId, page, branchId, dateRange }],
    queryFn: async () =>
      (
        await api.get('/finance/expenses', {
          params: {
            search,
            categoryId: categoryId || undefined,
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
    queryKey: ['expenses-stats', { search, categoryId, branchId, dateRange }],
    queryFn: async () =>
      (
        await api.get('/finance/expenses/stats', {
          params: {
            search,
            categoryId: categoryId || undefined,
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
      if (!payload.fundId) delete payload.fundId;
      return api.post('/finance/expenses', payload);
    },
    meta: { successMessage: 'Expense recorded', errorMessage: 'Failed to save expense' },
    onSuccess: () => {
      ['expenses', 'expenses-stats', 'finance-summary', 'funds', 'funds-stats'].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
      setOpen(false);
    },
  });

  const rows = listQuery.data?.data ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;
  const stats = statsQuery.data;

  const openForm = () => {
    setForm({ ...blank, categoryId: categories.data?.[0]?.id ?? '', fundId: defaultFundId });
    setOpen(true);
  };

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <ColorStatCard
          label="Total spent"
          value={formatCurrency(stats?.totalAmount ?? 0)}
          hint={`${stats?.total ?? 0} records`}
          icon={<TrendingDown size={22} />}
          color="rose"
        />
        <ColorStatCard
          label="This month"
          value={formatCurrency(stats?.monthAmount ?? 0)}
          hint={`${stats?.monthCount ?? 0} this month`}
          icon={<CalendarRange size={22} />}
          color="amber"
        />
        <ColorStatCard
          label="Average expense"
          value={formatCurrency(stats?.averageAmount ?? 0)}
          hint="Per record"
          icon={<Receipt size={22} />}
          color="violet"
        />
        <ColorStatCard
          label="Records"
          value={stats?.total ?? 0}
          hint="Matching filters"
          icon={<Hash size={22} />}
          color="indigo"
        />
        <ColorStatCard
          label="Categories"
          value={stats?.categories ?? 0}
          hint="Registered categories"
          icon={<FolderOpen size={22} />}
          color="blue"
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid w-full flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)] xl:grid-cols-[minmax(0,3fr)_minmax(16rem,20rem)]">
          <div className="relative min-w-0">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="py-2.5 pl-10"
              placeholder="Search category, payee, description, reference…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            className="py-2.5"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {categories.data?.map((c: { id: string; name: string }) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        {hasPermission('finance.expense.create') && (
          <Button onClick={openForm} disabled={!categories.data?.length}>
            <Plus size={16} /> Record Expense
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
              <Th>Date</Th>
              <Th>Category</Th>
              <Th>Paid to</Th>
              <Th>Employee</Th>
              <Th>Method</Th>
              <Th>Amount</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading && <EmptyRow colSpan={8} message="Loading…" />}
            {!listQuery.isLoading && rows.length === 0 && (
              <EmptyRow colSpan={8} message="No expenses yet." />
            )}
            {rows.map((e: ExpenseRecord, i: number) => (
              <tr
                key={e.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => setViewRecord(e)}
              >
                <SerialTd page={page} pageSize={15} index={i} />
                <Td>{formatDate(e.expenseDate)}</Td>
                <Td>
                  <Badge tone={CAT_BADGE_TONES[i % CAT_BADGE_TONES.length]}>
                    {e.category?.name ?? '—'}
                  </Badge>
                </Td>
                <Td className="text-slate-500">{e.paidTo ?? '—'}</Td>
                <Td className="text-slate-500">
                  {e.payslip?.employee
                    ? `${e.payslip.employee.firstName} ${e.payslip.employee.lastName}`
                    : '—'}
                </Td>
                <Td className="text-slate-500">{humanize(e.paymentMethod)}</Td>
                <Td className="font-semibold text-rose-600">{formatCurrency(Number(e.amount))}</Td>
                <Td className="text-right">
                  {hasPermission('finance.expense.view') && (
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="View details"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setViewRecord(e);
                        }}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        title="Download voucher"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          downloadExport(`/finance/expenses/${e.id}/voucher`, `expense-voucher-${e.id}.pdf`);
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

      <Modal open={open} onClose={() => setOpen(false)} title="Record Expense" size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Expense category"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              required
            >
              {categories.data?.map((c: { id: string; name: string }) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
              value={form.expenseDate}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
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
              label="Account (spend from)"
              value={form.fundId}
              onChange={(e) => setForm({ ...form, fundId: e.target.value })}
            >
              {funds.data?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.currency}) — {formatCurrency(f.balance, f.currency)}
                  {f.isDefault ? ' · Default' : ''}
                </option>
              ))}
            </Select>
            <Input
              label="Paid to (optional)"
              value={form.paidTo}
              onChange={(e) => setForm({ ...form, paidTo: e.target.value })}
            />
          </div>
          <Input
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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

      <ExpenseDetailModal
        record={viewRecord}
        onClose={() => setViewRecord(null)}
        canDownload={hasPermission('finance.expense.view')}
      />
    </div>
  );
}
