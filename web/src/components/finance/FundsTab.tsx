'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, PiggyBank, TrendingUp, TrendingDown, Wallet, Layers, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranches, useDefaultBranchId, useFunds, type FundOption } from '@/lib/hooks';
import { Card, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import { FundCard } from '@/components/finance/FundCard';
import { AccountStatementImport } from '@/components/finance/AccountStatementImport';
import { FinanceDateRangeFilter, type DateRangeValue } from '@/components/finance/FinanceDateRangeFilter';
import { FINANCE_ACCOUNT_TYPES, FINANCE_CURRENCIES, humanize } from '@/lib/constants';

const blankForm = () => ({
  name: '',
  branchId: '',
  code: '',
  description: '',
  currency: 'NGN',
  accountType: 'BANK',
  bankName: '',
  accountNumber: '',
  openingBalance: '',
  openingBalanceDate: '',
  isDefault: false,
});

export function FundsTab() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branchId = useDefaultBranchId();
  const branches = useBranches();
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: '', to: '' });
  const funds = useFunds(branchId, dateRange);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFundId, setImportFundId] = useState<string | undefined>();
  const [editing, setEditing] = useState<FundOption | null>(null);
  const [form, setForm] = useState(blankForm());

  const statsQuery = useQuery({
    queryKey: ['funds-stats', branchId, dateRange],
    queryFn: async () =>
      (
        await api.get('/finance/funds/stats', {
          params: {
            ...(branchId ? { branchId } : {}),
            ...(dateRange.from ? { from: dateRange.from } : {}),
            ...(dateRange.to ? { to: dateRange.to } : {}),
          },
        })
      ).data,
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        openingBalance: form.openingBalance ? Number(form.openingBalance) : 0,
        openingBalanceDate: form.openingBalanceDate || undefined,
        bankName: form.bankName || undefined,
        accountNumber: form.accountNumber || undefined,
      };
      if (editing) {
        const { branchId: _b, ...rest } = payload;
        return api.patch(`/finance/funds/${editing.id}`, rest);
      }
      return api.post('/finance/funds', payload);
    },
    meta: {
      successMessage: editing ? 'Account updated' : 'Account created',
      errorMessage: 'Failed to save account',
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['funds'] });
      qc.invalidateQueries({ queryKey: ['funds-stats'] });
      setOpen(false);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/finance/funds/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['funds'] });
      qc.invalidateQueries({ queryKey: ['funds-stats'] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    const main = branches.data?.find((b) => b.isMain) ?? branches.data?.[0];
    setForm({ ...blankForm(), branchId: main?.id ?? '' });
    setOpen(true);
  };

  const openEdit = (f: FundOption) => {
    setEditing(f);
    setForm({
      name: f.name,
      branchId: '',
      code: f.code ?? '',
      description: '',
      currency: f.currency ?? 'NGN',
      accountType: f.accountType ?? 'BANK',
      bankName: f.bankName ?? '',
      accountNumber: f.accountNumber ?? '',
      openingBalance: String(f.openingBalance ?? 0),
      openingBalanceDate: f.openingBalanceDate?.slice(0, 10) ?? '',
      isDefault: f.isDefault ?? false,
    });
    setOpen(true);
  };

  const stats = statsQuery.data;
  const primaryCurrency = funds.data?.[0]?.currency ?? 'NGN';
  const currencyStats = stats?.byCurrency?.[primaryCurrency];
  const periodFiltered = Boolean(dateRange.from || dateRange.to);

  return (
    <div>
      <div className="mb-4">
        <FinanceDateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColorStatCard
          label={periodFiltered ? 'Total in (period)' : 'Total balance'}
          value={
            periodFiltered
              ? formatCurrency(currencyStats?.totalIn ?? stats?.totalIn ?? 0, primaryCurrency)
              : formatCurrency(currencyStats?.totalBalance ?? stats?.totalBalance ?? 0, primaryCurrency)
          }
          hint={periodFiltered ? `${stats?.active ?? 0} active accounts` : `${stats?.active ?? 0} active accounts`}
          icon={<Wallet size={22} />}
          color="violet"
        />
        <ColorStatCard
          label={periodFiltered ? 'Total out (period)' : 'Total in'}
          value={
            periodFiltered
              ? formatCurrency(currencyStats?.totalOut ?? stats?.totalOut ?? 0, primaryCurrency)
              : formatCurrency(currencyStats?.totalIn ?? stats?.totalIn ?? 0, primaryCurrency)
          }
          hint={periodFiltered ? 'Expenses in range' : 'All income'}
          icon={<TrendingUp size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label={periodFiltered ? 'Net (period)' : 'Total out'}
          value={
            periodFiltered
              ? formatCurrency(
                  (currencyStats?.totalIn ?? stats?.totalIn ?? 0) -
                    (currencyStats?.totalOut ?? stats?.totalOut ?? 0),
                  primaryCurrency,
                )
              : formatCurrency(currencyStats?.totalOut ?? stats?.totalOut ?? 0, primaryCurrency)
          }
          hint={periodFiltered ? 'Income minus expenses' : 'All expenses'}
          icon={<TrendingDown size={22} />}
          color="rose"
        />
        <ColorStatCard
          label="Accounts"
          value={stats?.total ?? 0}
          hint={`${stats?.active ?? 0} active`}
          icon={<Layers size={22} />}
          color="blue"
        />
      </div>

      <div className="mb-4 flex flex-wrap justify-end gap-2">
        {hasPermission('finance.contribution.create') && (
          <Button variant="outline" onClick={() => { setImportFundId(undefined); setImportOpen(true); }}>
            <Upload size={16} /> Import statement
          </Button>
        )}
        {hasPermission('finance.fund.create') && (
          <Button onClick={openCreate}>
            <Plus size={16} /> New account
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {funds.data?.map((f, i) => (
          <FundCard
            key={f.id}
            fund={f}
            index={i}
            canUpdate={hasPermission('finance.fund.update')}
            canDelete={hasPermission('finance.fund.delete')}
            hasRecords={f.totalIn > 0 || f.totalOut > 0}
            canImport={hasPermission('finance.contribution.create')}
            onEdit={() => openEdit(f)}
            onDelete={() => {
              if (confirm(`Delete "${f.name}"?`)) del.mutate(f.id);
            }}
            onImport={() => {
              setImportFundId(f.id);
              setImportOpen(true);
            }}
          />
        ))}
        {funds.data?.length === 0 && (
          <Card className="p-8 sm:col-span-2 lg:col-span-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="rounded-full bg-violet-100 p-3 text-violet-600">
                <PiggyBank size={24} />
              </div>
              <p className="text-sm text-slate-500">
                No accounts yet. Create a bank or cash account to track balances by currency.
              </p>
            </div>
          </Card>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit account' : 'New account'} size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Account name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Zenith Main Account"
              required
            />
            <Input
              label="Code (optional)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <Select
              label="Account type"
              value={form.accountType}
              onChange={(e) => setForm({ ...form, accountType: e.target.value })}
            >
              {FINANCE_ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
            <Select
              label="Currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              {FINANCE_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input
              label="Bank name (optional)"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder="Zenith Bank"
            />
            <Input
              label="Account number (optional)"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              placeholder="1016362294"
            />
            <Input
              label="Opening balance"
              type="number"
              step="0.01"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            />
            <Input
              label="Opening balance date"
              type="date"
              value={form.openingBalanceDate}
              onChange={(e) => setForm({ ...form, openingBalanceDate: e.target.value })}
            />
          </div>
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
          <Input
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Default account for this branch (used when no account is selected)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Save' : 'Create account'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import bank statement"
        size="xl"
      >
        <AccountStatementImport
          key={importFundId ?? 'general'}
          defaultFundId={importFundId}
          onDone={() => setImportOpen(false)}
        />
      </Modal>
    </div>
  );
}
