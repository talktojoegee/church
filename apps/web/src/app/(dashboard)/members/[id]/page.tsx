'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  UserX,
  Plus,
  CalendarHeart,
  Phone,
  Mail,
  MapPin,
  Building2,
  Droplets,
  Flame,
  Briefcase,
  User,
  Clock,
  Sparkles,
  MessageSquare,
  History,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { MemberForm, emptyMember, type MemberFormValues } from '@/components/members/MemberForm';
import { MemberAvatar, memberHeroGradient } from '@/components/members/MemberAvatar';
import { PastorBadge } from '@/components/members/PastorBadge';
import { LIFE_EVENT_TYPES, STATUS_TONES, humanize } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

const INTERACTION_TONES: Record<string, 'green' | 'amber' | 'gray' | 'blue' | 'brand'> = {
  NOTE: 'brand',
  SMS: 'blue',
  EMAIL: 'green',
  STATUS: 'gray',
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
const LIFE_EVENT_COLORS: Record<string, string> = {
  BAPTISM: 'bg-sky-100 text-sky-700 ring-sky-200',
  HOLY_SPIRIT_BAPTISM: 'bg-amber-100 text-amber-700 ring-amber-200',
  MARRIAGE: 'bg-rose-100 text-rose-700 ring-rose-200',
  NEW_BIRTH: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  ORDINATION: 'bg-violet-100 text-violet-700 ring-violet-200',
  CHILD_DEDICATION: 'bg-pink-100 text-pink-700 ring-pink-200',
  MEMBERSHIP_CLASS: 'bg-blue-100 text-blue-700 ring-blue-200',
  DEATH: 'bg-slate-100 text-slate-600 ring-slate-200',
  OTHER: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
};

function truncateText(text: string, max = 72) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function relativeTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
}

function interactionAction(channel: string) {
  switch (channel) {
    case 'SMS':
      return 'sent an SMS';
    case 'EMAIL':
      return 'sent an email';
    case 'STATUS':
      return 'updated follow-up status';
    default:
      return 'logged a follow-up note';
  }
}

function groupInteractionsByDate(entries: any[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: any[] }[] = [];
  const index = new Map<string, number>();

  for (const entry of entries) {
    const day = new Date(entry.createdAt);
    day.setHours(0, 0, 0, 0);
    let label: string;
    if (day.getTime() === today.getTime()) label = 'Today';
    else if (day.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = day.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

    if (!index.has(label)) {
      index.set(label, groups.length);
      groups.push({ label, items: [] });
    }
    groups[index.get(label)!].items.push(entry);
  }

  return groups;
}

function StaffAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-sm">
      {initials}
    </span>
  );
}

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
    <div className={`rounded-xl p-4 ${color}`}>
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/60 shadow-sm">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value || '—'}</p>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 transition hover:border-slate-200 hover:bg-white">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value || '—'}</dd>
    </div>
  );
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMode, setContactMode] = useState<'sms' | 'email' | null>(null);
  const [contactMsg, setContactMsg] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [selectedInteraction, setSelectedInteraction] = useState<any | null>(null);
  const [eventForm, setEventForm] = useState({ title: '', type: 'BAPTISM', eventDate: '', description: '' });

  const openContactModal = (mode: 'sms' | 'email' | null = null) => {
    setContactMsg('');
    setContactSubject('');
    setContactMode(mode);
    setContactOpen(true);
  };

  const memberQuery = useQuery({
    queryKey: ['member', id],
    queryFn: async () => (await api.get(`/members/${id}`)).data,
  });

  const followUpsQuery = useQuery({
    queryKey: ['member-follow-ups', id],
    queryFn: async () => (await api.get(`/follow-ups/member/${id}`)).data,
  });

  const interactionsQuery = useQuery({
    queryKey: ['member-follow-up-interactions', id],
    queryFn: async () => (await api.get(`/follow-ups/member/${id}/interactions`)).data,
  });

  const markInactive = useMutation({
    mutationFn: () => api.patch(`/members/${id}`, { isActive: false }),
    meta: { successMessage: 'Member marked inactive', errorMessage: 'Failed to update member' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', id] });
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const sendSms = useMutation({
    mutationFn: () =>
      api.post(`/follow-ups/member/${id}/send-sms`, { message: contactMsg || undefined }),
    meta: { successMessage: 'SMS sent', errorMessage: 'Failed to send SMS' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-follow-up-interactions', id] });
      setContactMsg('');
    },
  });

  const sendEmail = useMutation({
    mutationFn: () =>
      api.post(`/follow-ups/member/${id}/send-email`, {
        message: contactMsg || undefined,
        subject: contactSubject || undefined,
      }),
    meta: { successMessage: 'Email sent', errorMessage: 'Failed to send email' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-follow-up-interactions', id] });
      setContactMsg('');
      setContactSubject('');
    },
  });

  const addEvent = useMutation({
    mutationFn: () => api.post(`/members/${id}/life-events`, eventForm),
    meta: { successMessage: 'Life event added', errorMessage: 'Failed to add life event' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', id] });
      setEventOpen(false);
      setEventForm({ title: '', type: 'BAPTISM', eventDate: '', description: '' });
    },
  });

  const delEvent = useMutation({
    mutationFn: (eventId: string) => api.delete(`/members/${id}/life-events/${eventId}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member', id] }),
  });

  if (memberQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const m = memberQuery.data;
  if (!m) return <div className="text-sm text-slate-500">Member not found.</div>;

  const editInitial: MemberFormValues = {
    ...emptyMember,
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    middleName: m.middleName ?? '',
    branchId: m.branch?.id ?? '',
    gender: m.gender ?? '',
    dateOfBirth: m.dateOfBirth ? m.dateOfBirth.slice(0, 10) : '',
    maritalStatus: m.maritalStatus ?? '',
    status: m.status,
    pastoralRole: m.pastoralRole ?? 'NONE',
    email: m.email ?? '',
    phone: m.phone ?? '',
    altPhone: m.altPhone ?? '',
    address: m.address ?? '',
    city: m.city ?? '',
    state: m.state ?? '',
    occupation: m.occupation ?? '',
    employer: m.employer ?? '',
    emergencyName: m.emergencyName ?? '',
    emergencyPhone: m.emergencyPhone ?? '',
    notes: m.notes ?? '',
    photoUrl: m.photoUrl ?? '',
    isBaptizedWater: m.isBaptizedWater ?? false,
    isBaptizedSpirit: m.isBaptizedSpirit ?? false,
    baptismDate: m.baptismDate ? m.baptismDate.slice(0, 10) : '',
    departmentIds: m.departments?.map((d: any) => d.department.id) ?? [],
  };

  const fullName = [m.firstName, m.middleName, m.lastName].filter(Boolean).join(' ');
  const location = [m.city, m.state].filter(Boolean).join(', ');
  const heroGradient = memberHeroGradient(m.firstName, m.lastName);
  const canMessage =
    hasPermission('membership.followup.update') || hasPermission('membership.member.update');
  const canSms = canMessage && m.isActive && !!m.phone;
  const canEmail = canMessage && m.isActive && !!m.email;
  const showContactActions = canMessage && m.isActive;
  const interactions = interactionsQuery.data ?? [];
  const groupedInteractions = groupInteractionsByDate(interactions);

  return (
    <div className="pb-8">
      <Link
        href="/members"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft size={16} /> Back to members
      </Link>

      {/* Hero */}
      <div className={`relative mb-6 overflow-hidden rounded-2xl ${heroGradient} shadow-lg`}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/5" />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
              <MemberAvatar
                photoUrl={m.photoUrl}
                firstName={m.firstName}
                lastName={m.lastName}
                size="xl"
              />
              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold text-white sm:text-3xl">{fullName}</h1>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <Badge tone={STATUS_TONES[m.status] ?? 'gray'}>{humanize(m.status)}</Badge>
                  {!m.isActive && <Badge tone="gray">Inactive</Badge>}
                  <PastorBadge role={m.pastoralRole} />
                  {m.membershipNumber && (
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                      {m.membershipNumber}
                    </span>
                  )}
                </div>
                {m.occupation && (
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-white/80 sm:justify-start">
                    <Briefcase size={14} /> {m.occupation}
                    {m.employer ? ` · ${m.employer}` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
              {hasPermission('membership.member.update') && (
                <Button
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil size={16} /> Edit
                </Button>
              )}
              {hasPermission('membership.member.update') && m.isActive && (
                <Button
                  variant="danger"
                  className="bg-rose-600/90 hover:bg-rose-700"
                  loading={markInactive.isPending}
                  onClick={() => {
                    if (confirm('Mark this member as inactive? They will remain in the system but hidden from active lists.')) {
                      markInactive.mutate();
                    }
                  }}
                >
                  <UserX size={16} /> Mark inactive
                </Button>
              )}
            </div>
          </div>

          {/* Quick contact strip */}
          <div className="mt-6 flex flex-wrap gap-3 border-t border-white/20 pt-5">
            {m.phone && (
              <a
                href={`tel:${m.phone}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Phone size={14} /> {m.phone}
              </a>
            )}
            {m.email && (
              <a
                href={`mailto:${m.email}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Mail size={14} /> {m.email}
              </a>
            )}
            {m.branch && (
              <Link
                href={`/branches/${m.branch.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Building2 size={14} /> {m.branch.name}
              </Link>
            )}
            {location && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
                <MapPin size={14} /> {location}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Highlight tiles */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoTile
          icon={<Clock size={18} className="text-violet-600" />}
          label="Member since"
          value={formatDate(m.joinedAt)}
          color="bg-violet-50 text-violet-900"
        />
        <InfoTile
          icon={<Droplets size={18} className="text-sky-600" />}
          label="Water baptism"
          value={m.isBaptizedWater ? 'Yes ✓' : 'Not yet'}
          color="bg-sky-50 text-sky-900"
        />
        <InfoTile
          icon={<Flame size={18} className="text-amber-600" />}
          label="Holy Spirit"
          value={m.isBaptizedSpirit ? 'Yes ✓' : 'Not yet'}
          color="bg-amber-50 text-amber-900"
        />
        <InfoTile
          icon={<Sparkles size={18} className="text-emerald-600" />}
          label="Departments"
          value={m.departments?.length ? `${m.departments.length} active` : 'None'}
          color="bg-emerald-50 text-emerald-900"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile details */}
        <Card className="overflow-hidden lg:col-span-2">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <User size={18} className="text-brand-600" /> Personal profile
            </h3>
          </div>
          <CardBody>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ProfileField label="Gender" value={humanize(m.gender)} />
              <ProfileField label="Date of birth" value={formatDate(m.dateOfBirth)} />
              <ProfileField label="Marital status" value={humanize(m.maritalStatus)} />
              <ProfileField label="Phone" value={m.phone} />
              <ProfileField label="Alt phone" value={m.altPhone} />
              <ProfileField label="Email" value={m.email} />
              <ProfileField label="Occupation" value={m.occupation} />
              <ProfileField label="Employer" value={m.employer} />
              <ProfileField label="Baptism date" value={formatDate(m.baptismDate)} />
              <ProfileField label="Emergency contact" value={m.emergencyName} />
              <ProfileField label="Emergency phone" value={m.emergencyPhone} />
              <ProfileField label="Address" value={[m.address, m.city, m.state].filter(Boolean).join(', ')} />
            </dl>
            {m.notes && (
              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Notes</p>
                <p className="mt-1 text-sm text-slate-700">{m.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Departments */}
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4">
              <h3 className="font-semibold text-slate-900">Departments</h3>
            </div>
            <CardBody>
              {m.departments?.length ? (
                <div className="flex flex-wrap gap-2">
                  {m.departments.map((d: any, i: number) => (
                    <span
                      key={d.department.id}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
                        ['bg-blue-100 text-blue-800 ring-blue-200', 'bg-violet-100 text-violet-800 ring-violet-200', 'bg-emerald-100 text-emerald-800 ring-emerald-200', 'bg-rose-100 text-rose-800 ring-rose-200'][i % 4]
                      }`}
                    >
                      {d.department.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No departments assigned yet.</p>
              )}
            </CardBody>
          </Card>

          {/* Life events timeline */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-rose-50 to-white px-5 py-4">
              <h3 className="font-semibold text-slate-900">Life events</h3>
              {hasPermission('membership.member.update') && (
                <button
                  onClick={() => setEventOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
            <CardBody>
              {m.lifeEvents?.length ? (
                <ol className="relative space-y-0 border-l-2 border-slate-100 pl-6">
                  {m.lifeEvents.map((e: any) => (
                    <li key={e.id} className="relative pb-6 last:pb-0">
                      <span className="absolute -left-[1.6rem] flex h-7 w-7 items-center justify-center rounded-full bg-white shadow ring-2 ring-slate-100">
                        <CalendarHeart size={13} className="text-brand-600" />
                      </span>
                      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition hover:shadow-md">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900">{e.title}</p>
                            <p className="mt-1 text-xs text-slate-400">{formatDate(e.eventDate)}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                              LIFE_EVENT_COLORS[e.type] ?? LIFE_EVENT_COLORS.OTHER
                            }`}
                          >
                            {humanize(e.type)}
                          </span>
                        </div>
                        {e.description && (
                          <p className="mt-2 text-sm text-slate-500">{e.description}</p>
                        )}
                        {hasPermission('membership.member.update') && (
                          <button
                            onClick={() => delEvent.mutate(e.id)}
                            className="mt-2 text-xs text-slate-300 transition hover:text-rose-500"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="py-6 text-center">
                  <CalendarHeart className="mx-auto mb-2 text-slate-200" size={36} />
                  <p className="text-sm text-slate-400">No life events recorded.</p>
                  {hasPermission('membership.member.update') && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setEventOpen(true)}>
                      <Plus size={14} /> Add first event
                    </Button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <History size={18} className="text-indigo-600" /> Follow-up log
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Activity feed of all follow-up conversations and contacts.
              </p>
            </div>

            {showContactActions && (
              <div className="border-b border-indigo-100 bg-indigo-50/60 px-5 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">Contact member</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-indigo-200 bg-white hover:bg-indigo-50"
                    disabled={!canSms}
                    onClick={() => openContactModal('sms')}
                  >
                    <MessageSquare size={16} /> Send SMS
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    disabled={!canEmail}
                    onClick={() => openContactModal('email')}
                  >
                    <Mail size={16} /> Send email
                  </Button>
                </div>
                {!m.phone && !m.email && (
                  <p className="mt-2 text-xs text-amber-700">
                    Add a phone number or email on this profile to send messages.
                  </p>
                )}
                {m.phone && !m.email && (
                  <p className="mt-2 text-xs text-slate-500">No email on file — SMS only.</p>
                )}
                {!m.phone && m.email && (
                  <p className="mt-2 text-xs text-slate-500">No phone on file — email only.</p>
                )}
              </div>
            )}

            <CardBody className="p-0">
              {interactionsQuery.isLoading && (
                <p className="p-5 text-sm text-slate-400">Loading…</p>
              )}
              {!interactionsQuery.isLoading && !interactions.length && (
                <div className="px-5 py-8 text-center">
                  <History className="mx-auto mb-2 text-slate-200" size={36} />
                  <p className="text-sm text-slate-400">No follow-up conversations logged yet.</p>
                  {showContactActions && (canSms || canEmail) && (
                    <p className="mt-2 text-xs text-slate-500">Use the buttons above to send the first message.</p>
                  )}
                </div>
              )}

              {interactions.length > 0 && (
                <div className="max-h-80 overflow-y-auto">
                  {groupedInteractions.map((group) => (
                    <div key={group.label}>
                      <p className="sticky top-0 z-10 bg-slate-50/95 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 backdrop-blur-sm">
                        {group.label}
                      </p>
                      <ul className="divide-y divide-slate-100">
                        {group.items.map((entry: any) => {
                          const performer = entry.performer;
                          const performerFirst = performer?.firstName ?? 'Unknown';
                          const performerLast = performer?.lastName ?? 'staff';
                          return (
                            <li key={entry.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedInteraction(entry)}
                                className="flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-indigo-50/50"
                              >
                                {performer ? (
                                  <StaffAvatar firstName={performerFirst} lastName={performerLast} />
                                ) : (
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                                    ?
                                  </span>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-slate-800">
                                    <span className="font-semibold">
                                      {performer ? `${performerFirst} ${performerLast}` : 'Unknown staff'}
                                    </span>{' '}
                                    {interactionAction(entry.channel)}
                                    {entry.campaign && (
                                      <>
                                        {' '}
                                        on{' '}
                                        <span className="font-medium text-brand-600">{entry.campaign.title}</span>
                                      </>
                                    )}
                                  </p>
                                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                    {truncateText(entry.note, 100)}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-400">{relativeTime(entry.createdAt)}</span>
                                    <Badge tone={INTERACTION_TONES[entry.channel] ?? 'gray'} className="text-[10px]">
                                      {humanize(entry.channel)}
                                    </Badge>
                                  </div>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {followUpsQuery.data?.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Campaigns</p>
                  <ul className="max-h-28 space-y-2 overflow-y-auto">
                    {followUpsQuery.data.map((f: any) => (
                      <li key={f.id}>
                        <Link
                          href={`/follow-up/${f.campaign.id}`}
                          className="block rounded-lg border border-slate-100 p-3 transition hover:border-brand-200 hover:bg-brand-50/30"
                        >
                          <p className="font-medium text-slate-900">{f.campaign.title}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {humanize(f.campaign.type)} · {formatDate(f.campaign.dueDate)}
                          </p>
                          <Badge tone={f.status === 'COMPLETED' ? 'green' : f.status === 'CONTACTED' ? 'blue' : 'amber'} className="mt-2">
                            {humanize(f.status)}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        open={!!selectedInteraction}
        onClose={() => setSelectedInteraction(null)}
        title="Follow-up details"
        size="lg"
      >
        {selectedInteraction && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Date & time</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(selectedInteraction.createdAt)}</p>
              </div>
              <Badge tone={INTERACTION_TONES[selectedInteraction.channel] ?? 'gray'}>
                {humanize(selectedInteraction.channel)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Carried out by</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {selectedInteraction.performer
                    ? `${selectedInteraction.performer.firstName} ${selectedInteraction.performer.lastName}`
                    : 'Unknown staff'}
                </p>
              </div>
              {selectedInteraction.campaign && (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Campaign</p>
                  <Link
                    href={`/follow-up/${selectedInteraction.campaign.id}`}
                    className="mt-1 inline-block text-sm font-medium text-brand-600 hover:underline"
                    onClick={() => setSelectedInteraction(null)}
                  >
                    {selectedInteraction.campaign.title}
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Conversation / message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {selectedInteraction.note}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              {showContactActions && (canSms || canEmail) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedInteraction(null);
                    openContactModal(canSms ? 'sms' : 'email');
                  }}
                >
                  <MessageSquare size={14} /> Send new message
                </Button>
              )}
              <Button onClick={() => setSelectedInteraction(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={contactOpen}
        onClose={() => {
          setContactOpen(false);
          setContactMode(null);
        }}
        title={contactMode === 'sms' ? `Send SMS to ${fullName}` : contactMode === 'email' ? `Email ${fullName}` : `Message ${fullName}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className={`rounded-lg border p-3 ${canSms ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Phone</span>
              <p className="mt-1 text-sm font-medium">{m.phone ?? 'Not on file'}</p>
            </div>
            <div className={`rounded-lg border p-3 ${canEmail ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</span>
              <p className="mt-1 text-sm font-medium">{m.email ?? 'Not on file'}</p>
            </div>
          </div>

          {canEmail && (
            <Input
              label="Email subject (optional)"
              value={contactSubject}
              onChange={(e) => setContactSubject(e.target.value)}
              placeholder="Follow-up from your church"
            />
          )}

          <Textarea
            label="Message (optional — a default will be used if left blank)"
            value={contactMsg}
            onChange={(e) => setContactMsg(e.target.value)}
            placeholder="Write your follow-up message…"
          />

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setContactOpen(false);
                setContactMode(null);
              }}
            >
              Cancel
            </Button>
            {canSms && (
              <Button
                variant={contactMode === 'email' ? 'outline' : 'primary'}
                loading={sendSms.isPending}
                onClick={() => {
                  sendSms.mutate(undefined, {
                    onSuccess: () => {
                      setContactOpen(false);
                      setContactMode(null);
                    },
                  });
                }}
              >
                <MessageSquare size={14} /> Send SMS
              </Button>
            )}
            {canEmail && (
              <Button
                variant={contactMode === 'sms' ? 'outline' : 'primary'}
                loading={sendEmail.isPending}
                onClick={() => {
                  sendEmail.mutate(undefined, {
                    onSuccess: () => {
                      setContactOpen(false);
                      setContactMode(null);
                    },
                  });
                }}
              >
                <Mail size={14} /> Send email
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Member" size="xl">
        {editOpen && (
          <MemberForm
            key={id}
            initial={editInitial}
            onDone={() => {
              setEditOpen(false);
              qc.invalidateQueries({ queryKey: ['member', id] });
            }}
            onCancel={() => setEditOpen(false)}
          />
        )}
      </Modal>

      <Modal open={eventOpen} onClose={() => setEventOpen(false)} title="Add Life Event">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addEvent.mutate();
          }}
          className="space-y-4"
        >
          <Input label="Title" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required />
          <Select label="Type" value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}>
            {LIFE_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </Select>
          <Input label="Date" type="date" value={eventForm.eventDate} onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })} required />
          <Input label="Description" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEventOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={addEvent.isPending}>
              Add event
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
