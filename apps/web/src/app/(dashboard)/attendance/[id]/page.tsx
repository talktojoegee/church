'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Trash2,
  Users,
  User,
  Baby,
  UserPlus,
  CalendarDays,
  MapPin,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { humanize } from '@/lib/constants';
import { formatDate, cn } from '@/lib/utils';

const TYPE_GRADIENTS: Record<string, string> = {
  SUNDAY_SERVICE: 'from-violet-600 to-purple-800',
  MIDWEEK_SERVICE: 'from-sky-600 to-blue-800',
  PRAYER_MEETING: 'from-rose-600 to-pink-800',
  BIBLE_STUDY: 'from-emerald-600 to-teal-800',
  SPECIAL_PROGRAM: 'from-amber-600 to-orange-700',
  OTHER: 'from-slate-600 to-slate-800',
};

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
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/60 shadow-sm dark:bg-white/10">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function AttendanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();

  const sessionQuery = useQuery({
    queryKey: ['attendance-session', id],
    queryFn: async () => (await api.get(`/attendance/${id}`)).data,
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/attendance/${id}`),
    meta: { successMessage: 'Session deleted', errorMessage: 'Failed to delete session' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-stats'] });
      router.push('/attendance');
    },
  });

  if (sessionQuery.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  const s = sessionQuery.data;
  if (!s) return <p className="text-sm text-slate-500">Attendance session not found.</p>;

  const checkedIn = s.records?.filter((r: any) => r.present) ?? [];
  const heroGradient = TYPE_GRADIENTS[s.type] ?? TYPE_GRADIENTS.OTHER;

  return (
    <div>
      <Link
        href="/attendance"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft size={16} /> Back to attendance
      </Link>

      <div className={cn('mb-6 overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-lg', heroGradient)}>
        <div className="pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="mb-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
              {humanize(s.type)}
            </span>
            <h1 className="text-2xl font-bold">{s.title}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/85">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={15} /> {formatDate(s.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={15} /> {s.branch?.name}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={15} /> {s.totalCount} total
              </span>
            </div>
          </div>
          {hasPermission('engagement.attendance.delete') && (
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                if (confirm('Delete this service record?')) del.mutate();
              }}
              loading={del.isPending}
            >
              <Trash2 size={16} /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <InfoTile
          icon={<Users size={18} className="text-violet-600" />}
          label="Total"
          value={s.totalCount}
          color="bg-gradient-to-br from-violet-100 to-purple-50 text-violet-900 dark:from-violet-950/50 dark:to-purple-950/30 dark:text-violet-100"
        />
        <InfoTile
          icon={<User size={18} className="text-sky-600" />}
          label="Male"
          value={s.maleCount}
          color="bg-gradient-to-br from-sky-100 to-blue-50 text-sky-900 dark:from-sky-950/50 dark:to-blue-950/30 dark:text-sky-100"
        />
        <InfoTile
          icon={<User size={18} className="text-indigo-600" />}
          label="Female"
          value={s.femaleCount}
          color="bg-gradient-to-br from-indigo-100 to-violet-50 text-indigo-900 dark:from-indigo-950/50 dark:to-violet-950/30 dark:text-indigo-100"
        />
        <InfoTile
          icon={<Baby size={18} className="text-amber-600" />}
          label="Children"
          value={s.childrenCount}
          color="bg-gradient-to-br from-amber-100 to-orange-50 text-amber-900 dark:from-amber-950/50 dark:to-orange-950/30 dark:text-amber-100"
        />
        <InfoTile
          icon={<UserPlus size={18} className="text-emerald-600" />}
          label="Newcomers"
          value={s.newcomerCount}
          color="bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-900 dark:from-emerald-950/50 dark:to-teal-950/30 dark:text-emerald-100"
        />
      </div>

      {s.notes && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-orange-950/20">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            <FileText size={14} /> Notes
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-amber-950 dark:text-amber-100/90">{s.notes}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 dark:border-slate-800 dark:from-emerald-950/40 dark:to-teal-950/30">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <CheckCircle2 size={18} className="text-emerald-600" /> Checked-in members
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {checkedIn.length
              ? `${checkedIn.length} member${checkedIn.length === 1 ? '' : 's'} marked present`
              : 'No individual check-ins recorded for this service'}
          </p>
        </div>
        <Table>
          <thead>
            <tr>
              <SerialTh />
              <Th>Member</Th>
              <Th>Membership #</Th>
              <Th>Phone</Th>
            </tr>
          </thead>
          <tbody>
            {!checkedIn.length && (
              <EmptyRow colSpan={4} message="Headcount only — no member check-ins." />
            )}
            {checkedIn.map((row: any, i: number) => (
              <tr key={row.id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                <SerialTd index={i} />
                <Td>
                  <Link href={`/members/${row.member.id}`} className="flex items-center gap-3">
                    <MemberAvatar
                      photoUrl={row.member.photoUrl}
                      firstName={row.member.firstName}
                      lastName={row.member.lastName}
                    />
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {row.member.firstName} {row.member.lastName}
                    </span>
                  </Link>
                </Td>
                <Td>{row.member.membershipNumber ?? '—'}</Td>
                <Td>{row.member.phone ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
