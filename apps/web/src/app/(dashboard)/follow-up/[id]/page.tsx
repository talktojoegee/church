'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Phone,
  CheckCircle,
  XCircle,
  ChevronDown,
  History,
  User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Input';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { PastorBadge } from '@/components/members/PastorBadge';
import { CONTENT_STATUS_TONES, humanize } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

const RECIPIENT_TONES: Record<string, 'green' | 'amber' | 'gray' | 'blue'> = {
  PENDING: 'amber',
  CONTACTED: 'blue',
  COMPLETED: 'green',
  SKIPPED: 'gray',
};

const RECIPIENT_CARD_STYLE: Record<string, string> = {
  PENDING: 'from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/30 dark:to-orange-950/20 dark:border-amber-800',
  CONTACTED: 'from-sky-50 to-blue-50 border-sky-200 dark:from-sky-950/30 dark:to-blue-950/20 dark:border-sky-800',
  COMPLETED: 'from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-950/30 dark:to-teal-950/20 dark:border-emerald-800',
  SKIPPED: 'from-slate-50 to-slate-100 border-slate-200 dark:from-slate-900 dark:to-slate-800 dark:border-slate-700',
};

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

function truncateText(text: string, max = 120) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function interactionAction(channel: string) {
  switch (channel) {
    case 'SMS':
      return 'sent an SMS';
    case 'EMAIL':
      return 'sent an email';
    case 'STATUS':
      return 'updated status';
    default:
      return 'logged a note';
  }
}

function StaffAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
      {firstName[0]}
      {lastName[0]}
    </span>
  );
}

export default function FollowUpCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'history' | 'compose'>('compose');

  const campaignQuery = useQuery({
    queryKey: ['follow-up-campaign', id],
    queryFn: async () => (await api.get(`/follow-ups/campaigns/${id}`)).data,
  });

  const recipientQuery = useQuery({
    queryKey: ['follow-up-recipient', id, selectedId],
    queryFn: async () => (await api.get(`/follow-ups/campaigns/${id}/recipients/${selectedId}`)).data,
    enabled: !!selectedId,
  });

  const openContact = (rid: string) => {
    setSelectedId(rid);
    setNote('');
    setMsg('');
    setActiveTab('compose');
  };

  const updateRecipient = useMutation({
    mutationFn: (payload: { status?: string; note?: string }) =>
      api.patch(`/follow-ups/campaigns/${id}/recipients/${selectedId}`, payload),
    meta: { successMessage: 'Follow-up updated', errorMessage: 'Failed to update follow-up' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follow-up-campaign', id] });
      qc.invalidateQueries({ queryKey: ['follow-up-recipient', id, selectedId] });
      qc.invalidateQueries({ queryKey: ['member-follow-up-interactions'] });
    },
  });

  const sendSms = useMutation({
    mutationFn: () =>
      api.post(`/follow-ups/campaigns/${id}/recipients/${selectedId}/send-sms`, { message: msg || undefined }),
    meta: { successMessage: 'SMS sent', errorMessage: 'Failed to send SMS' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follow-up-campaign', id] });
      qc.invalidateQueries({ queryKey: ['follow-up-recipient', id, selectedId] });
      qc.invalidateQueries({ queryKey: ['member-follow-up-interactions'] });
      setMsg('');
      setActiveTab('history');
    },
  });

  const sendEmail = useMutation({
    mutationFn: () =>
      api.post(`/follow-ups/campaigns/${id}/recipients/${selectedId}/send-email`, { message: msg || undefined }),
    meta: { successMessage: 'Email sent', errorMessage: 'Failed to send email' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follow-up-campaign', id] });
      qc.invalidateQueries({ queryKey: ['follow-up-recipient', id, selectedId] });
      qc.invalidateQueries({ queryKey: ['member-follow-up-interactions'] });
      setMsg('');
      setActiveTab('history');
    },
  });

  if (campaignQuery.isLoading) return <div className="text-sm text-slate-500">Loading…</div>;
  const c = campaignQuery.data;
  if (!c) return <div className="text-sm text-slate-500">Campaign not found.</div>;

  const rec = recipientQuery.data;
  const member = rec?.member;
  const interactions: any[] = rec?.interactions ?? [];
  const canSms = !!(rec?.contactPhone || member?.phone);
  const canEmail = !!(rec?.contactEmail || member?.email);

  return (
    <div>
      <Link href="/follow-up" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <ArrowLeft size={16} /> Back to follow-ups
      </Link>

      <div className="mb-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone="brand" className="mb-2 bg-white/20 text-white">{humanize(c.type)}</Badge>
            <h1 className="text-2xl font-bold">{c.title}</h1>
            {c.objective && <p className="mt-2 max-w-2xl text-sm text-white/85">{c.objective}</p>}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/80">
              <span>Due: {formatDate(c.dueDate)}</span>
              <span>Branch: {c.branch?.name}</span>
              <span>{c.recipients?.length ?? 0} people</span>
            </div>
          </div>
          <Badge tone={CONTENT_STATUS_TONES[c.status] ?? 'gray'}>{humanize(c.status)}</Badge>
        </div>
        {c.notes && (
          <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/90">{c.notes}</p>
        )}
        {c.assignees?.length > 0 && (
          <div className="mt-4 rounded-lg bg-white/10 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Responsible persons</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {c.assignees.map((a: any) => (
                <li
                  key={a.id}
                  className="rounded-full bg-white/15 px-3 py-1 text-sm text-white"
                  title={a.notifiedAt ? `Notified ${formatDate(a.notifiedAt)}` : 'Not yet notified'}
                >
                  {a.user.firstName} {a.user.lastName}
                  {a.notifiedAt && <span className="ml-1 text-white/60">✓</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">People to follow up</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Select a person to view conversation history and send a follow-up.
        </p>
      </div>

      {!c.recipients?.length && (
        <Card className="p-8 text-center">
          <User className="mx-auto mb-2 text-slate-200 dark:text-slate-700" size={36} />
          <p className="text-sm text-slate-400">No recipients in this campaign.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {c.recipients?.map((r: any) => {
          const cardStyle = RECIPIENT_CARD_STYLE[r.status] ?? RECIPIENT_CARD_STYLE.PENDING;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => openContact(r.id)}
              className={`group rounded-2xl border bg-gradient-to-br p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardStyle}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {r.member ? (
                    <MemberAvatar
                      photoUrl={r.member.photoUrl}
                      firstName={r.member.firstName}
                      lastName={r.member.lastName}
                      size="md"
                    />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-sm font-semibold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                      {(r.contactName ?? '?')[0]}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{r.contactName}</p>
                    {r.member?.membershipNumber && (
                      <p className="text-xs text-slate-500">{r.member.membershipNumber}</p>
                    )}
                  </div>
                </div>
                <Badge tone={RECIPIENT_TONES[r.status] ?? 'gray'}>{humanize(r.status)}</Badge>
              </div>

              <div className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                {r.contactPhone ? (
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="shrink-0 text-slate-400" />
                    {r.contactPhone}
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-slate-400">
                    <Phone size={14} /> No phone on file
                  </p>
                )}
                {r.note && (
                  <p className="line-clamp-2 text-xs italic text-slate-500 dark:text-slate-400">
                    &ldquo;{truncateText(r.note, 80)}&rdquo;
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 dark:border-white/10">
                <span className="text-xs font-medium text-indigo-700 group-hover:underline dark:text-indigo-300">
                  View & follow up
                </span>
                <ChevronDown size={16} className="-rotate-90 text-indigo-600 dark:text-indigo-400" />
              </div>
            </button>
          );
        })}
      </div>

      <Modal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={rec ? `Follow up: ${rec.contactName}` : 'Contact'}
        size="lg"
      >
        {recipientQuery.isLoading && <p className="text-sm text-slate-500">Loading contact…</p>}
        {rec && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/80">
              {member ? (
                <>
                  <MemberAvatar photoUrl={member.photoUrl} firstName={member.firstName} lastName={member.lastName} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {member.firstName} {member.lastName}
                      </p>
                      <Badge tone={RECIPIENT_TONES[rec.status] ?? 'gray'}>{humanize(rec.status)}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <PastorBadge role={member.pastoralRole} />
                      {member.status && <Badge tone="gray">{humanize(member.status)}</Badge>}
                    </div>
                    {member.membershipNumber && (
                      <p className="text-xs text-slate-400">{member.membershipNumber}</p>
                    )}
                  </div>
                  {member.id && (
                    <Link href={`/members/${member.id}`} className="text-sm text-brand-600 hover:underline">
                      View profile
                    </Link>
                  )}
                </>
              ) : (
                <div>
                  <p className="font-semibold">{rec.contactName}</p>
                  <p className="text-sm text-slate-500">{rec.contactPhone ?? 'No phone'}</p>
                </div>
              )}
            </div>

            {member && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                  <span className="text-slate-400">Phone</span>
                  <p className="font-medium">{member.phone ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                  <span className="text-slate-400">Email</span>
                  <p className="font-medium">{member.email ?? '—'}</p>
                </div>
              </div>
            )}

            <Tabs
              tabs={[
                {
                  id: 'history',
                  label: interactions.length
                    ? `Previous conversations (${interactions.length})`
                    : 'Previous conversations',
                },
                { id: 'compose', label: 'Compose message' },
              ]}
              active={activeTab}
              onChange={(id) => setActiveTab(id as 'history' | 'compose')}
            />

            {activeTab === 'history' && (
              <>
                {!interactions.length && (
                  <div className="py-6 text-center">
                    <History className="mx-auto mb-2 text-slate-200 dark:text-slate-700" size={32} />
                    <p className="text-sm text-slate-400">No conversations logged yet for this person.</p>
                  </div>
                )}
                {interactions.length > 0 && (
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {interactions.map((entry: any) => {
                      const performer = entry.performer;
                      return (
                        <div
                          key={entry.id}
                          className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50"
                        >
                          <div className="flex items-start gap-3">
                            {performer ? (
                              <StaffAvatar firstName={performer.firstName} lastName={performer.lastName} />
                            ) : (
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                                ?
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-slate-800 dark:text-slate-200">
                                <span className="font-semibold">
                                  {performer ? `${performer.firstName} ${performer.lastName}` : 'Unknown staff'}
                                </span>{' '}
                                {interactionAction(entry.channel)}
                                {entry.campaign && (
                                  <>
                                    {' '}
                                    · <span className="font-medium text-brand-600">{entry.campaign.title}</span>
                                  </>
                                )}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">
                                {entry.note}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-slate-400">{formatDateTime(entry.createdAt)}</span>
                                <Badge tone={INTERACTION_TONES[entry.channel] ?? 'gray'} className="text-[10px]">
                                  {humanize(entry.channel)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {activeTab === 'compose' && (
              <div className="space-y-4">
                <Textarea
                  label="Follow-up note"
                  value={note || rec.note || ''}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Record what was discussed or planned…"
                  rows={3}
                />

                <Textarea
                  label="Message to send (SMS / email)"
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Write your follow-up message here…"
                  rows={4}
                />

                {hasPermission('membership.followup.update') && (
                  <div className="flex flex-wrap gap-2">
                    {canSms && (
                      <Button variant="outline" size="sm" loading={sendSms.isPending} onClick={() => sendSms.mutate()}>
                        <MessageSquare size={14} /> Send SMS
                      </Button>
                    )}
                    {canEmail && (
                      <Button variant="outline" size="sm" loading={sendEmail.isPending} onClick={() => sendEmail.mutate()}>
                        <Mail size={14} /> Send Email
                      </Button>
                    )}
                    <Button
                      size="sm"
                      loading={updateRecipient.isPending}
                      onClick={() => updateRecipient.mutate({ note: note || rec.note, status: 'CONTACTED' })}
                    >
                      <Phone size={14} /> Save note
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                      onClick={() => updateRecipient.mutate({ note: note || rec.note, status: 'COMPLETED' })}
                    >
                      <CheckCircle size={14} /> Mark followed up
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateRecipient.mutate({ note: note || rec.note, status: 'SKIPPED' })}
                    >
                      <XCircle size={14} /> Not reached
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
