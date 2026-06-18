'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, CalendarCheck, Wallet, Briefcase } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardBody, StatCard } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { formatCurrency, formatDate } from '@/lib/utils';
import { humanize } from '@/lib/constants';
import { ReportsExplorer } from '@/components/reports/ReportsExplorer';
import { BarChart } from '@/components/dashboard/BarChart';

const PAGE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'export', label: 'Export Reports' },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('overview');

  const overviewQuery = useQuery({
    queryKey: ['reports-overview'],
    queryFn: async () => (await api.get('/reports/overview')).data,
    enabled: tab === 'overview',
  });
  const growthQuery = useQuery({
    queryKey: ['membership-growth'],
    queryFn: async () => (await api.get('/reports/membership-growth')).data,
    enabled: tab === 'overview',
  });

  const o = overviewQuery.data;

  const attendanceBars =
    o?.attendance?.trend?.map((t: { date: string; totalCount: number; title?: string }) => ({
      label: new Date(t.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
      value: t.totalCount,
      sublabel: t.title,
    })) ?? [];

  const growthBars =
    growthQuery.data?.map((g: { month: string; count: number }) => ({
      label: g.month,
      value: g.count,
    })) ?? [];

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Cross-module analytics, filtered exports, and church insights."
      />

      <Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} />

      <div className="mt-6">
        {tab === 'export' && <ReportsExplorer />}

        {tab === 'overview' && (
          overviewQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading reports…</p>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Members" value={o?.members?.total ?? 0} hint={`+${o?.members?.newThisMonth ?? 0} this month`} icon={<Users size={20} />} />
                <StatCard label="Avg. Attendance" value={o?.attendance?.monthAverage ?? 0} hint={`Peak: ${o?.attendance?.monthPeak ?? 0}`} icon={<CalendarCheck size={20} />} />
                <StatCard label="Monthly Income" value={formatCurrency(o?.finance?.monthIncome ?? 0)} hint={`Expenses: ${formatCurrency(o?.finance?.monthExpense ?? 0)}`} icon={<Wallet size={20} />} />
                <StatCard label="Net Balance" value={formatCurrency(o?.finance?.netBalance ?? 0)} icon={<Briefcase size={20} />} />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Attendance trend" description="Last 12 services" />
                  <CardBody>
                    {attendanceBars.length ? (
                      <BarChart data={attendanceBars} color="brand" />
                    ) : (
                      <p className="text-sm text-slate-400">No attendance data yet.</p>
                    )}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Membership growth" description="New members by month" />
                  <CardBody>
                    {growthBars.length ? (
                      <BarChart data={growthBars} color="emerald" />
                    ) : (
                      <p className="text-sm text-slate-400">No growth data yet.</p>
                    )}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Income by type" />
                  <CardBody>
                    {o?.finance?.byType?.length ? (
                      <div className="space-y-3">
                        {o.finance.byType.map((t: { id?: string; name: string; amount: number }) => (
                          <div key={t.id ?? t.name}>
                            <div className="mb-1 flex justify-between text-sm">
                              <span className="text-slate-600">{t.name}</span>
                              <span className="font-medium">{formatCurrency(t.amount)}</span>
                            </div>
                            <div className="h-4 rounded-full bg-slate-100">
                              <div className="h-4 rounded-full bg-brand-500" style={{ width: `${Math.min(100, (t.amount / (o.finance.totalIncome || 1)) * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No finance data yet.</p>
                    )}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Operations snapshot" />
                  <CardBody>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div><dt className="text-slate-400">Employees</dt><dd className="text-lg font-semibold">{o?.operations?.employees ?? 0}</dd></div>
                      <div><dt className="text-slate-400">System users</dt><dd className="text-lg font-semibold">{o?.operations?.users ?? 0}</dd></div>
                      <div><dt className="text-slate-400">Open follow-ups</dt><dd className="text-lg font-semibold">{o?.operations?.openFollowUps ?? 0}</dd></div>
                      <div><dt className="text-slate-400">Pending testimonies</dt><dd className="text-lg font-semibold">{o?.operations?.pendingTestimonies ?? 0}</dd></div>
                      <div><dt className="text-slate-400">Upcoming events</dt><dd className="text-lg font-semibold">{o?.operations?.upcomingEvents ?? 0}</dd></div>
                    </dl>
                  </CardBody>
                </Card>
              </div>

              {o?.recentContributions?.length > 0 && (
                <Card className="mt-6">
                  <CardHeader title="Recent income" />
                  <CardBody>
                    <ul className="divide-y divide-slate-100">
                      {o.recentContributions.map((c: { id: string; member: string; type: string; fund: string; amount: number; receivedAt: string }) => (
                        <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                          <div>
                            <span className="font-medium text-slate-900">{c.member}</span>
                            <span className="ml-2 text-slate-400">{humanize(c.type)} · {c.fund}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-emerald-700">{formatCurrency(c.amount)}</span>
                            <p className="text-xs text-slate-400">{formatDate(c.receivedAt)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
