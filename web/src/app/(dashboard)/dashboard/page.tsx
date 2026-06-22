'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  UserSquare2,
  Wallet,
  CalendarCheck,
  PhoneCall,
  UserPlus,
  Mail,
  BarChart3,
  CalendarDays,
  Heart,
  Users,
  ArrowRight,
  Sparkles,
  Megaphone,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardHeader, CardBody, ColorStatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { BarChart, GroupedBarChart } from '@/components/dashboard/BarChart';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CONTENT_STATUS_TONES, STATUS_TONES, humanize } from '@/lib/constants';

const QUICK_ACTIONS = [
  { href: '/members', label: 'Add member', desc: 'Register a person', icon: UserPlus, color: 'from-brand-700 to-brand-500' },
  { href: '/attendance', label: 'Record service', desc: 'Log attendance', icon: CalendarCheck, color: 'from-brand-600 to-flame-orange' },
  { href: '/finance', label: 'Record giving', desc: 'Tithes & offerings', icon: Wallet, color: 'from-emerald-500 to-teal-600' },
  { href: '/follow-up', label: 'Follow-up', desc: 'Pastoral care tasks', icon: PhoneCall, color: 'from-rose-500 to-pink-600' },
  { href: '/communication', label: 'Send message', desc: 'Email or SMS', icon: Mail, color: 'from-gold to-gold-light' },
  { href: '/reports', label: 'View reports', desc: 'Analytics & trends', icon: BarChart3, color: 'from-brand-900 to-brand-700' },
] as const;

export default function DashboardPage() {
  const { user } = useAuth();

  const overviewQuery = useQuery({
    queryKey: ['reports-overview'],
    queryFn: async () => (await api.get('/reports/overview')).data,
  });
  const growthQuery = useQuery({
    queryKey: ['membership-growth'],
    queryFn: async () => (await api.get('/reports/membership-growth')).data,
  });

  const o = overviewQuery.data;
  const loading = overviewQuery.isLoading;

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

  const memberStatusDonut =
    o?.members?.byStatus
      ?.filter((s: { count: number }) => s.count > 0)
      .map((s: { status: string; count: number }) => ({
        label: humanize(s.status),
        value: s.count,
      })) ?? [];

  const maxFinance = Math.max(
    1,
    ...(o?.finance?.byType?.map((t: { amount: number }) => t.amount) ?? [1]),
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-brand-700 to-flame-orange p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-white/80">
              <Sparkles size={16} /> Church Management Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Welcome back, {user?.firstName ?? 'there'}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Your church at a glance — members, attendance, giving, and pastoral care in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user?.roles.slice(0, 2).map((r) => (
              <span key={r} className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/members">
          <ColorStatCard
            label="Total Members"
            value={loading ? '…' : (o?.members?.total ?? 0)}
            hint={`+${o?.members?.newThisMonth ?? 0} joined this month`}
            icon={<UserSquare2 size={22} />}
            color="violet"
          />
        </Link>
        <Link href="/attendance">
          <ColorStatCard
            label="Avg. Attendance"
            value={loading ? '…' : (o?.attendance?.monthAverage ?? 0)}
            hint={`Last service: ${o?.attendance?.lastTotal ?? 0} · Peak ${o?.attendance?.monthPeak ?? 0}`}
            icon={<CalendarCheck size={22} />}
            color="brand"
          />
        </Link>
        <Link href="/finance">
          <ColorStatCard
            label="Monthly Giving"
            value={loading ? '…' : formatCurrency(o?.finance?.monthIncome ?? 0)}
            hint={`Expenses: ${formatCurrency(o?.finance?.monthExpense ?? 0)}`}
            icon={<Wallet size={22} />}
            color="emerald"
          />
        </Link>
        <Link href="/follow-up">
          <ColorStatCard
            label="Open Follow-ups"
            value={loading ? '…' : (o?.operations?.openFollowUps ?? 0)}
            hint={`${o?.operations?.pendingTestimonies ?? 0} testimonies · ${o?.operations?.upcomingEvents ?? 0} events`}
            icon={<PhoneCall size={22} />}
            color="rose"
          />
        </Link>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader
            title="Attendance trend"
            description="Last 12 services — hover bars for details"
            action={
              <Link href="/attendance" className="text-xs font-medium text-brand-600 hover:underline">
                View all
              </Link>
            }
          />
          <CardBody>
            {attendanceBars.length ? (
              <BarChart data={attendanceBars} color="violet" />
            ) : (
              <EmptyChart message="No attendance recorded yet." href="/attendance" />
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader
            title="Membership growth"
            description="New members by month"
            action={
              <Link href="/members" className="text-xs font-medium text-brand-600 hover:underline">
                View all
              </Link>
            }
          />
          <CardBody>
            {growthBars.length ? (
              <BarChart data={growthBars} color="emerald" />
            ) : (
              <EmptyChart message="No membership data yet." href="/members" />
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-1 lg:col-span-2 xl:col-span-1">
          <CardHeader
            title="Giving vs expenses"
            description="Last 6 months"
            action={
              <Link href="/finance" className="text-xs font-medium text-brand-600 hover:underline">
                Finance
              </Link>
            }
          />
          <CardBody>
            {o?.monthlyFinance?.length ? (
              <GroupedBarChart
                data={o.monthlyFinance.map((row: { month: string; income: number; expense: number }) => ({
                  label: row.month,
                  income: row.income,
                  expense: row.expense,
                }))}
                formatValue={(v) => formatCurrency(v)}
              />
            ) : (
              <EmptyChart message="No finance data yet." href="/finance" />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Second charts + quick actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Members by status" description="Distribution across your directory" />
          <CardBody>
            {memberStatusDonut.length ? (
              <DonutChart
                data={memberStatusDonut}
                centerLabel="Total"
                centerValue={o?.members?.total ?? 0}
              />
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No members yet.</p>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="Income by type" description="All-time breakdown" />
          <CardBody>
            {o?.finance?.byType?.length ? (
              <div className="space-y-4">
                {o.finance.byType.slice(0, 6).map((t: { id?: string; name: string; amount: number }, i: number) => {
                  const pct = (t.amount / maxFinance) * 100;
                  const colors = ['bg-violet-500', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];
                  return (
                    <div key={t.id ?? t.name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-slate-600">{t.name}</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(t.amount)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No giving recorded yet.</p>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="Quick actions" description="Jump to common tasks" />
          <CardBody className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group flex flex-col rounded-xl border border-slate-100 p-3 transition hover:border-transparent hover:shadow-md"
                >
                  <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${a.color} text-white shadow-sm`}>
                    <a.icon size={18} />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-brand-700">{a.label}</p>
                  <p className="text-[11px] text-slate-400">{a.desc}</p>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Activity feeds */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Recent giving"
          icon={<Wallet size={18} />}
          href="/finance"
          empty="No income yet."
          isEmpty={!o?.recentContributions?.length}
        >
          {o?.recentContributions?.map((c: any) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{c.member}</p>
                <p className="text-xs text-slate-400">
                  {humanize(c.type)}{c.fund ? ` · ${c.fund}` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-emerald-600">{formatCurrency(c.amount)}</p>
                <p className="text-xs text-slate-400">{formatDate(c.receivedAt)}</p>
              </div>
            </li>
          ))}
        </SectionCard>

        <SectionCard
          title="New members"
          icon={<Users size={18} />}
          href="/members"
          empty="No recent registrations."
          isEmpty={!o?.recentMembers?.length}
        >
          {o?.recentMembers?.map((m: any) => (
            <li key={m.id}>
              <Link href={`/members/${m.id}`} className="flex items-center gap-3 py-3 transition hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                <MemberAvatar
                  photoUrl={m.photoUrl}
                  firstName={m.name.split(' ')[0]}
                  lastName={m.name.split(' ').slice(1).join(' ') || ''}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{m.name}</p>
                  <p className="text-xs text-slate-400">Joined {formatDate(m.joinedAt)}</p>
                </div>
                <Badge tone={STATUS_TONES[m.status] ?? 'gray'}>{humanize(m.status)}</Badge>
              </Link>
            </li>
          ))}
        </SectionCard>

        <SectionCard
          title="Follow-up campaigns"
          icon={<PhoneCall size={18} />}
          href="/follow-up"
          empty="No follow-up campaigns yet."
          isEmpty={!o?.recentCampaigns?.length}
        >
          {o?.recentCampaigns?.map((c: any) => (
            <li key={c.id}>
              <Link href={`/follow-up/${c.id}`} className="flex items-center justify-between gap-3 py-3 transition hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-400">
                    {c.recipientCount} people · {humanize(c.type)}
                    {c.assignees?.length ? ` · ${c.assignees.join(', ')}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={CONTENT_STATUS_TONES[c.status] ?? 'gray'}>{humanize(c.status)}</Badge>
                  <ArrowRight size={14} className="text-slate-300" />
                </div>
              </Link>
            </li>
          ))}
        </SectionCard>

        <SectionCard
          title="Upcoming events"
          icon={<CalendarDays size={18} />}
          href="/events"
          empty="No upcoming events."
          isEmpty={!o?.upcomingEvents?.length}
        >
          {o?.upcomingEvents?.map((e: any) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{e.title}</p>
                <p className="text-xs text-slate-400">
                  {formatDate(e.startAt)}
                  {e.location ? ` · ${e.location}` : ''}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                {e.registrations} registered
              </span>
            </li>
          ))}
        </SectionCard>
      </div>

      {/* Operations strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <OpsTile label="System users" value={o?.operations?.users} icon={<Users size={18} />} color="bg-indigo-50 text-indigo-700" />
        <OpsTile label="Employees" value={o?.operations?.employees} icon={<Heart size={18} />} color="bg-rose-50 text-rose-700" />
        <OpsTile label="Pending testimonies" value={o?.operations?.pendingTestimonies} icon={<Megaphone size={18} />} color="bg-amber-50 text-amber-700" href="/testimonies" />
        <OpsTile label="Net balance" value={formatCurrency(o?.finance?.netBalance ?? 0)} icon={<Wallet size={18} />} color="bg-emerald-50 text-emerald-700" href="/finance" isText />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  href,
  empty,
  isEmpty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  empty: string;
  isEmpty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</span>
            {title}
          </span>
        }
        action={
          <Link href={href} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
            View all <ArrowRight size={12} />
          </Link>
        }
      />
      <CardBody className="pt-2">
        {isEmpty ? (
          <p className="py-6 text-center text-sm text-slate-400">{empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100">{children}</ul>
        )}
      </CardBody>
    </Card>
  );
}

function OpsTile({
  label,
  value,
  icon,
  color,
  href,
  isText,
}: {
  label: string;
  value?: number | string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  isText?: boolean;
}) {
  const inner = (
    <div className={`flex items-center gap-3 rounded-xl p-4 ${color} transition hover:shadow-md`}>
      <div className="rounded-lg bg-white/60 p-2">{icon}</div>
      <div>
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className={`font-bold ${isText ? 'text-sm' : 'text-xl'}`}>{value ?? '—'}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function EmptyChart({ message, href }: { message: string; href: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
      <p className="text-sm text-slate-400">{message}</p>
      <Link href={href} className="text-xs font-medium text-brand-600 hover:underline">
        Get started →
      </Link>
    </div>
  );
}
