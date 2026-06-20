'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CalendarRange,
  HandCoins,
  Receipt,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useDefaultBranchId, useFunds } from '@/lib/hooks';
import { Card, CardHeader, CardBody, ColorStatCard } from '@/components/ui/Card';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { BarChart, GroupedBarChart } from '@/components/dashboard/BarChart';
import { formatCurrency, cn, responsiveFigureClass } from '@/lib/utils';
import { FinanceDateRangeFilter, type DateRangeValue } from '@/components/finance/FinanceDateRangeFilter';

export function OverviewTab() {
  const branchId = useDefaultBranchId();
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: '', to: '' });

  const summaryQuery = useQuery({
    queryKey: ['finance-summary', branchId, dateRange],
    queryFn: async () =>
      (
        await api.get('/finance/summary', {
          params: {
            ...(branchId ? { branchId } : {}),
            ...(dateRange.from ? { from: dateRange.from } : {}),
            ...(dateRange.to ? { to: dateRange.to } : {}),
          },
        })
      ).data,
  });
  const funds = useFunds(branchId);
  const s = summaryQuery.data;

  const donutData =
    s?.byType?.map((t: { name: string; amount: number }) => ({
      label: t.name,
      value: t.amount,
    })) ?? [];

  const expenseBarData =
    s?.byCategory?.map((c: { name: string; amount: number }) => ({
      label: c.name.length > 8 ? c.name.slice(0, 7) + '…' : c.name,
      value: c.amount,
      sublabel: c.name,
    })) ?? [];

  const pledgePct =
    s?.pledgedTotal > 0 ? Math.round((s.pledgeFulfilled / s.pledgedTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <FinanceDateRangeFilter value={dateRange} onChange={setDateRange} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ColorStatCard
          label="Total Income"
          value={formatCurrency(s?.totalIncome ?? 0)}
          icon={<TrendingUp size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="Total Expenses"
          value={formatCurrency(s?.totalExpense ?? 0)}
          icon={<TrendingDown size={22} />}
          color="rose"
        />
        <ColorStatCard
          label="Net Balance"
          value={formatCurrency(s?.netBalance ?? 0)}
          hint={s?.netBalance < 0 ? 'Deficit' : 'Surplus'}
          icon={<Wallet size={22} />}
          color={s?.netBalance < 0 ? 'amber' : 'violet'}
        />
        <ColorStatCard
          label="This Month In"
          value={formatCurrency(s?.monthIncome ?? 0)}
          hint={`Out: ${formatCurrency(s?.monthExpense ?? 0)}`}
          icon={<CalendarRange size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="Income"
          value={s?.contributionCount ?? 0}
          hint="Recorded entries"
          icon={<HandCoins size={22} />}
          color="indigo"
        />
        <ColorStatCard
          label="Expenses"
          value={s?.expenseCount ?? 0}
          hint="Recorded entries"
          icon={<Receipt size={22} />}
          color="rose"
        />
      </div>

      <Card>
        <CardHeader title="Income vs expenses (6 months)" />
        <CardBody>
          {s?.monthlyTrend?.length ? (
            <GroupedBarChart
              data={s.monthlyTrend}
              formatValue={(v) => formatCurrency(v)}
            />
          ) : (
            <p className="text-sm text-slate-400">No trend data yet.</p>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Income by type" />
          <CardBody>
            {donutData.length ? (
              <DonutChart
                data={donutData}
                centerValue={formatCurrency(s?.totalIncome ?? 0)}
                centerLabel="total income"
                formatValue={(v) => formatCurrency(v)}
              />
            ) : (
              <p className="text-sm text-slate-400">No income recorded.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Expenses by category" />
          <CardBody>
            {expenseBarData.length ? (
              <BarChart
                data={expenseBarData}
                color="violet"
                formatValue={(v) => formatCurrency(v)}
              />
            ) : (
              <p className="text-sm text-slate-400">No expenses recorded.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Income breakdown" />
          <CardBody>
            {s?.byType?.length ? (
              <div className="space-y-3">
                {s.byType.map((t: { id: string; name: string; amount: number }, i: number) => {
                  const max = Math.max(1, ...s.byType.map((x: { amount: number }) => x.amount));
                  const colors = [
                    'bg-violet-500',
                    'bg-emerald-500',
                    'bg-sky-500',
                    'bg-amber-500',
                    'bg-rose-500',
                    'bg-cyan-500',
                  ];
                  return (
                    <div key={t.id ?? t.name}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-medium text-slate-700">{t.name}</span>
                        <span
                          className={cn(
                            'shrink-0 tabular-nums font-semibold text-slate-900',
                            responsiveFigureClass(formatCurrency(t.amount), 'compact'),
                          )}
                        >
                          {formatCurrency(t.amount)}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100">
                        <div
                          className={cn('h-2.5 rounded-full transition-all', colors[i % colors.length])}
                          style={{ width: `${(t.amount / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No income data.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Account balances & pledges" />
          <CardBody>
            {funds.data?.length ? (
              <ul className="divide-y divide-slate-100">
                {funds.data.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 py-2.5">
                    <span className="min-w-0 truncate text-sm font-medium text-slate-700">{f.name}</span>
                    <span
                      className={cn(
                        'shrink-0 tabular-nums font-bold',
                        responsiveFigureClass(formatCurrency(f.balance), 'compact'),
                        f.balance < 0 ? 'text-rose-600' : 'text-emerald-600',
                      )}
                    >
                      {formatCurrency(f.balance, f.currency ?? 'NGN')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No accounts yet.</p>
            )}
            {s && (
              <div className="mt-4 space-y-3 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-slate-600">Pledged</span>
                  <span
                    className={cn(
                      'shrink-0 tabular-nums font-semibold text-slate-900',
                      responsiveFigureClass(formatCurrency(s.pledgedTotal), 'compact'),
                    )}
                  >
                    {formatCurrency(s.pledgedTotal)}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-slate-600">Fulfilled</span>
                  <span
                    className={cn(
                      'shrink-0 tabular-nums font-semibold text-emerald-700',
                      responsiveFigureClass(formatCurrency(s.pledgeFulfilled), 'compact'),
                    )}
                  >
                    {formatCurrency(s.pledgeFulfilled)}
                  </span>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span>{pledgePct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/80">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                      style={{ width: `${pledgePct}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
