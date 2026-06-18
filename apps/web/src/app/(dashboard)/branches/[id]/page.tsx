'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Heart,
  Layers,
  Megaphone,
  ClipboardList,
  Pencil,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { PastorBadge } from '@/components/members/PastorBadge';
import { humanize, CONTENT_STATUS_TONES } from '@/lib/constants';
import { cn, formatDate } from '@/lib/utils';

const DETAIL_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'departments', label: 'Departments' },
  { id: 'groups', label: 'Groups' },
  { id: 'events', label: 'Events' },
  { id: 'outreaches', label: 'Outreaches' },
  { id: 'testimonies', label: 'Testimonies' },
  { id: 'attendance', label: 'Attendance' },
];

const ROW_GRADIENTS = [
  'hover:from-violet-50 hover:to-purple-50',
  'hover:from-emerald-50 hover:to-teal-50',
  'hover:from-sky-50 hover:to-blue-50',
  'hover:from-amber-50 hover:to-orange-50',
  'hover:from-rose-50 hover:to-pink-50',
  'hover:from-indigo-50 hover:to-blue-50',
];

function EntityLink({
  href,
  title,
  subtitle,
  badge,
  index,
}: {
  href: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  index: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 transition',
        'bg-gradient-to-r hover:border-brand-200 hover:shadow-sm',
        ROW_GRADIENTS[index % ROW_GRADIENTS.length],
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900 group-hover:text-brand-700">{title}</p>
        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        <ChevronRight
          size={18}
          className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
        />
      </div>
    </Link>
  );
}

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState('overview');
  const [editPastors, setEditPastors] = useState(false);
  const [pastorForm, setPastorForm] = useState({ branchPastorId: '', assistantPastorId: '' });

  const detailsQuery = useQuery({
    queryKey: ['branch-details', id],
    queryFn: async () => (await api.get(`/branches/${id}/details`)).data,
  });

  const membersQuery = useQuery({
    queryKey: ['branch-members', id],
    queryFn: async () =>
      (await api.get('/members', { params: { branchId: id, pageSize: 200 } })).data.data,
    enabled: editPastors,
  });

  const savePastors = useMutation({
    mutationFn: () =>
      api.patch(`/branches/${id}`, {
        branchPastorId: pastorForm.branchPastorId || null,
        assistantPastorId: pastorForm.assistantPastorId || null,
      }),
    meta: { successMessage: 'Pastors updated', errorMessage: 'Failed to update pastors' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-details', id] });
      qc.invalidateQueries({ queryKey: ['branches'] });
      setEditPastors(false);
    },
  });

  if (detailsQuery.isLoading) {
    return <div className="text-sm text-slate-500">Loading branch…</div>;
  }

  const data = detailsQuery.data;
  if (!data) return <div className="text-sm text-slate-500">Branch not found.</div>;

  const { branch, stats, recentMembers, departments, groups, events, outreaches, testimonies, attendanceSessions } =
    data;
  const location = [branch.city, branch.state].filter(Boolean).join(', ');

  const openPastorEdit = () => {
    setPastorForm({
      branchPastorId: branch.branchPastor?.id ?? '',
      assistantPastorId: branch.assistantPastor?.id ?? '',
    });
    setEditPastors(true);
  };

  const pastorCard = (title: string, person: any) => (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {person ? (
        <Link href={`/members/${person.id}`} className="mt-3 flex items-center gap-3 hover:opacity-80">
          <MemberAvatar photoUrl={person.photoUrl} firstName={person.firstName} lastName={person.lastName} size="md" />
          <div>
            <p className="font-semibold text-slate-900">
              {person.firstName} {person.lastName}
            </p>
            <p className="text-sm text-slate-500">{person.phone ?? '—'}</p>
          </div>
        </Link>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Not assigned</p>
      )}
    </div>
  );

  const statTabMap: Record<string, string> = {
    members: 'overview',
    departments: 'departments',
    groups: 'groups',
    events: 'events',
    outreaches: 'outreaches',
    testimonies: 'testimonies',
    attendance: 'attendance',
  };

  return (
    <div>
      <Link
        href="/branches"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> Back to branches
      </Link>

      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              {branch.isMain && (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">Main branch</span>
              )}
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
                {branch.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-mono text-xs">{branch.code}</span>
            </div>
            <h1 className="text-2xl font-bold">{branch.name}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/80">
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} /> {location}
                </span>
              )}
              {branch.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={14} /> {branch.phone}
                </span>
              )}
              {branch.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail size={14} /> {branch.email}
                </span>
              )}
            </div>
          </div>
          {hasPermission('org.branch.update') && (
            <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={openPastorEdit}>
              <Pencil size={16} /> Assign pastors
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        {[
          { key: 'members', label: 'Members', value: stats.members, icon: Users, color: 'violet' as const },
          { key: 'pastors', label: 'Pastors', value: stats.pastors, icon: Heart, color: 'rose' as const, tab: 'overview' },
          { key: 'departments', label: 'Departments', value: stats.departments, icon: Building2, color: 'emerald' as const },
          { key: 'groups', label: 'Groups', value: stats.groups, icon: Layers, color: 'blue' as const },
          { key: 'events', label: 'Events', value: stats.events, icon: Calendar, color: 'amber' as const },
          { key: 'outreaches', label: 'Outreaches', value: stats.outreaches, icon: Megaphone, color: 'indigo' as const },
          { key: 'testimonies', label: 'Testimonies', value: stats.testimonies, icon: Heart, color: 'rose' as const },
          {
            key: 'attendance',
            label: 'Attendance',
            value: stats.totalAttendance,
            hint: `${stats.attendanceSessions} sessions`,
            icon: ClipboardList,
            color: 'blue' as const,
          },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setTab(statTabMap[s.key] ?? s.tab ?? s.key)}
            className="text-left transition hover:scale-[1.02]"
          >
            <ColorStatCard
              label={s.label}
              value={s.value}
              hint={s.hint}
              icon={<s.icon size={20} />}
              color={s.color}
            />
          </button>
        ))}
      </div>

      <Tabs tabs={DETAIL_TABS} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
            {pastorCard('Branch Pastor', branch.branchPastor)}
            {pastorCard('Assistant Pastor', branch.assistantPastor)}
          </div>
          <Card>
            <CardHeader title="Recent members" />
            <CardBody className="space-y-3">
              {recentMembers.length === 0 && <p className="text-sm text-slate-400">No members yet.</p>}
              {recentMembers.map((m: any) => (
                <Link
                  key={m.id}
                  href={`/members/${m.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-slate-50"
                >
                  <MemberAvatar photoUrl={m.photoUrl} firstName={m.firstName} lastName={m.lastName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {m.firstName} {m.lastName}
                    </p>
                    <p className="text-xs text-slate-400">{m.membershipNumber}</p>
                  </div>
                  <PastorBadge role={m.pastoralRole} />
                  <Badge tone="gray">{humanize(m.status)}</Badge>
                </Link>
              ))}
              <Link href={`/members?branchId=${id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  View all members
                </Button>
              </Link>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Quick links" />
            <CardBody className="space-y-2">
              {DETAIL_TABS.filter((t) => t.id !== 'overview').map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  {t.label}
                  <ChevronRight size={16} />
                </button>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'departments' && (
        <Card>
          <CardHeader
            title="Departments"
            description="Click a department to view members and leadership."
          />
          <CardBody className="space-y-2">
            {departments.length === 0 && <p className="text-sm text-slate-400">No departments.</p>}
            {departments.map((d: any, i: number) => (
              <EntityLink
                key={d.id}
                href={`/departments/${d.id}`}
                title={d.name}
                subtitle={d.leader ? `Led by ${d.leader.firstName} ${d.leader.lastName}` : 'No leader assigned'}
                badge={<Badge tone="blue">{d._count.members} members</Badge>}
                index={i}
              />
            ))}
          </CardBody>
        </Card>
      )}

      {tab === 'groups' && (
        <Card>
          <CardHeader title="Groups" description="Click a group to view members and meetings." />
          <CardBody className="space-y-2">
            {groups.length === 0 && <p className="text-sm text-slate-400">No groups.</p>}
            {groups.map((g: any, i: number) => (
              <EntityLink
                key={g.id}
                href={`/groups/${g.id}`}
                title={g.name}
                subtitle={[g.category, g.meetingDay].filter(Boolean).join(' · ') || 'Group'}
                badge={<Badge tone="brand">{g._count.members} members</Badge>}
                index={i}
              />
            ))}
          </CardBody>
        </Card>
      )}

      {tab === 'events' && (
        <Card>
          <CardHeader title="Events" description="Click an event to view details and registrations." />
          <CardBody className="space-y-2">
            {events.length === 0 && <p className="text-sm text-slate-400">No events.</p>}
            {events.map((e: any, i: number) => (
              <EntityLink
                key={e.id}
                href={`/events?view=${e.id}`}
                title={e.title}
                subtitle={[formatDate(e.startAt), e.location].filter(Boolean).join(' · ')}
                badge={<Badge tone={CONTENT_STATUS_TONES[e.status] ?? 'gray'}>{humanize(e.status)}</Badge>}
                index={i}
              />
            ))}
          </CardBody>
        </Card>
      )}

      {tab === 'outreaches' && (
        <Card>
          <CardHeader title="Outreaches" description="Click an outreach to view full details." />
          <CardBody className="space-y-2">
            {outreaches.length === 0 && <p className="text-sm text-slate-400">No outreaches.</p>}
            {outreaches.map((o: any, i: number) => (
              <EntityLink
                key={o.id}
                href={`/outreaches/${o.id}`}
                title={o.title}
                subtitle={o.location ?? formatDate(o.startAt)}
                badge={<Badge tone={CONTENT_STATUS_TONES[o.status] ?? 'gray'}>{humanize(o.status)}</Badge>}
                index={i}
              />
            ))}
          </CardBody>
        </Card>
      )}

      {tab === 'testimonies' && (
        <Card>
          <CardHeader title="Testimonies" description="Click a testimony to read the full story." />
          <CardBody className="space-y-2">
            {testimonies.length === 0 && <p className="text-sm text-slate-400">No testimonies.</p>}
            {testimonies.map((t: any, i: number) => (
              <EntityLink
                key={t.id}
                href={`/testimonies/${t.id}`}
                title={t.title}
                subtitle={t.member ? `${t.member.firstName} ${t.member.lastName}` : t.authorName ?? 'Anonymous'}
                badge={<Badge tone={CONTENT_STATUS_TONES[t.status] ?? 'gray'}>{humanize(t.status)}</Badge>}
                index={i}
              />
            ))}
          </CardBody>
        </Card>
      )}

      {tab === 'attendance' && (
        <Card>
          <CardHeader title="Attendance sessions" description="Click a session to view the full register." />
          <CardBody>
            {attendanceSessions.length === 0 ? (
              <p className="text-sm text-slate-400">No attendance records.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {attendanceSessions.map((a: any, i: number) => (
                  <Link
                    key={a.id}
                    href={`/attendance/${a.id}`}
                    className={cn(
                      'group rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50 p-4 transition',
                      'hover:border-sky-200 hover:shadow-md',
                    )}
                  >
                    <p className="font-medium text-slate-900 group-hover:text-sky-800">{a.title}</p>
                    <p className="text-xs text-slate-500">{formatDate(a.date)}</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-sky-700">{a.totalCount}</p>
                    <p className="text-xs text-slate-400">total attendance</p>
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-sky-600">
                      View session <ChevronRight size={14} className="transition group-hover:translate-x-0.5" />
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Modal open={editPastors} onClose={() => setEditPastors(false)} title="Assign branch pastors">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            savePastors.mutate();
          }}
          className="space-y-4"
        >
          <Select
            label="Branch pastor"
            value={pastorForm.branchPastorId}
            onChange={(e) => setPastorForm({ ...pastorForm, branchPastorId: e.target.value })}
          >
            <option value="">— None —</option>
            {membersQuery.data?.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </Select>
          <Select
            label="Assistant pastor"
            value={pastorForm.assistantPastorId}
            onChange={(e) => setPastorForm({ ...pastorForm, assistantPastorId: e.target.value })}
          >
            <option value="">— None —</option>
            {membersQuery.data?.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditPastors(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={savePastors.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
