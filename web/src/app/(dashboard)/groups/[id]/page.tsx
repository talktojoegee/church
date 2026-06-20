'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  UserPlus,
  UserMinus,
  Trash2,
  Crown,
  Pencil,
  Phone,
  Mail,
  History,
  CalendarDays,
  Megaphone,
  StickyNote,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Checkbox } from '@/components/ui/Checkbox';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { MemberPicker } from '@/components/members/MemberPicker';
import { STATUS_TONES, humanize } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

const emptyForm = {
  name: '',
  category: '',
  description: '',
  meetingDay: '',
  meetingTime: '',
  location: '',
};

const emptyMeetingForm = {
  title: '',
  topic: '',
  heldAt: '',
  notes: '',
};

const emptyNoteForm = { title: '', body: '' };
const emptyAnnouncementForm = { title: '', body: '' };

const ACTIVITY_STYLE: Record<
  string,
  { icon: typeof History; ring: string; bg: string; badge: 'gray' | 'green' | 'red' | 'amber' | 'blue' | 'brand' }
> = {
  MEMBER_JOINED: { icon: UserPlus, ring: 'ring-emerald-200', bg: 'bg-emerald-100 text-emerald-700', badge: 'green' },
  MEMBER_LEFT: { icon: UserMinus, ring: 'ring-rose-200', bg: 'bg-rose-100 text-rose-700', badge: 'red' },
  LEADER_CHANGED: { icon: Crown, ring: 'ring-amber-200', bg: 'bg-amber-100 text-amber-700', badge: 'amber' },
  GROUP_UPDATED: { icon: Pencil, ring: 'ring-slate-200', bg: 'bg-slate-100 text-slate-700', badge: 'gray' },
  MEETING_HELD: { icon: CalendarDays, ring: 'ring-sky-200', bg: 'bg-sky-100 text-sky-700', badge: 'blue' },
  ANNOUNCEMENT: { icon: Megaphone, ring: 'ring-violet-200', bg: 'bg-violet-100 text-violet-700', badge: 'brand' },
  NOTE: { icon: StickyNote, ring: 'ring-teal-200', bg: 'bg-teal-100 text-teal-700', badge: 'green' },
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupByDay(items: any[]) {
  const groups: { label: string; items: any[] }[] = [];
  const map = new Map<string, any[]>();
  for (const item of items) {
    const label = formatDate(item.createdAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  for (const [label, groupItems] of map) {
    groups.push({ label, items: groupItems });
  }
  return groups;
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
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/60 shadow-sm dark:bg-white/10">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value || '—'}</p>
    </div>
  );
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [meetingForm, setMeetingForm] = useState(emptyMeetingForm);
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncementForm);

  const groupQuery = useQuery({
    queryKey: ['group', id],
    queryFn: async () => (await api.get(`/groups/${id}`)).data,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['group', id] });
    qc.invalidateQueries({ queryKey: ['groups'] });
  };

  const updateGroup = useMutation({
    mutationFn: () => api.patch(`/groups/${id}`, form).then((r) => r.data),
    meta: { successMessage: 'Group updated', errorMessage: 'Failed to update group' },
    onSuccess: () => {
      invalidate();
      setEditOpen(false);
    },
  });

  const setLeader = useMutation({
    mutationFn: (memberId: string) =>
      api.patch(`/groups/${id}`, { leaderId: memberId }).then((r) => r.data),
    meta: { successMessage: 'Group leader updated', errorMessage: 'Failed to set leader' },
    onSuccess: invalidate,
  });

  const addMembers = useMutation({
    mutationFn: async () => {
      for (const memberId of selectedMembers) {
        await api.post(`/groups/${id}/members/${memberId}`);
      }
    },
    meta: { successMessage: 'Members added', errorMessage: 'Failed to add members' },
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
      setSelectedMembers([]);
    },
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/groups/${id}/members/${memberId}`).then((r) => r.data),
    meta: { successMessage: 'Member removed', errorMessage: 'Failed to remove member' },
    onSuccess: invalidate,
  });

  const logMeeting = useMutation({
    mutationFn: () =>
      api
        .post(`/groups/${id}/meetings`, {
          ...meetingForm,
          attendeeIds,
        })
        .then((r) => r.data),
    meta: { successMessage: 'Meeting logged', errorMessage: 'Failed to log meeting' },
    onSuccess: () => {
      invalidate();
      setMeetingOpen(false);
      setMeetingForm(emptyMeetingForm);
      setAttendeeIds([]);
    },
  });

  const addNote = useMutation({
    mutationFn: () => api.post(`/groups/${id}/notes`, noteForm).then((r) => r.data),
    meta: { successMessage: 'Note added', errorMessage: 'Failed to add note' },
    onSuccess: () => {
      invalidate();
      setNoteOpen(false);
      setNoteForm(emptyNoteForm);
    },
  });

  const postAnnouncement = useMutation({
    mutationFn: () => api.post(`/groups/${id}/announcements`, announcementForm).then((r) => r.data),
    meta: { successMessage: 'Announcement posted', errorMessage: 'Failed to post announcement' },
    onSuccess: () => {
      invalidate();
      setAnnouncementOpen(false);
      setAnnouncementForm(emptyAnnouncementForm);
    },
  });

  const g = groupQuery.data;
  const activities: any[] = g?.activities ?? [];
  const groupedActivities = useMemo(() => groupByDay(activities), [activities]);

  if (groupQuery.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!g) return <p className="text-sm text-slate-500">Group not found.</p>;

  const canEdit = hasPermission('membership.group.update');
  const existingMemberIds: string[] =
    g.members?.map((row: { member: { id: string } }) => row.member.id) ?? [];
  const meeting = [g.meetingDay, g.meetingTime].filter(Boolean).join(' · ');

  const openEdit = () => {
    setForm({
      name: g.name,
      category: g.category ?? '',
      description: g.description ?? '',
      meetingDay: g.meetingDay ?? '',
      meetingTime: g.meetingTime ?? '',
      location: g.location ?? '',
    });
    setEditOpen(true);
  };

  const openMeetingModal = () => {
    setMeetingForm({
      title: `${g.name} meeting`,
      topic: '',
      heldAt: new Date().toISOString().slice(0, 16),
      notes: '',
    });
    setAttendeeIds(existingMemberIds);
    setMeetingOpen(true);
  };

  const toggleAttendee = (memberId: string) => {
    setAttendeeIds((prev) =>
      prev.includes(memberId) ? prev.filter((x) => x !== memberId) : [...prev, memberId],
    );
  };

  return (
    <div>
      <Link
        href="/groups"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft size={16} /> Back to groups
      </Link>

      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/70">{g.branch?.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{g.name}</h1>
              {g.category && (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                  {g.category}
                </span>
              )}
            </div>
            {g.description && <p className="mt-2 max-w-2xl text-sm text-white/85">{g.description}</p>}
          </div>
          {canEdit && (
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={openEdit}
            >
              <Pencil size={16} /> Edit group
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <InfoTile
          icon={<Users size={18} className="text-emerald-600" />}
          label="Members"
          value={g._count?.members ?? g.members?.length ?? 0}
          color="bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
        />
        <InfoTile
          icon={<CalendarDays size={18} className="text-sky-600" />}
          label="Meetings logged"
          value={g._count?.meetings ?? 0}
          color="bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
        />
        <InfoTile
          icon={<Activity size={18} className="text-indigo-600" />}
          label="Activity items"
          value={g._count?.activities ?? activities.length}
          color="bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100"
        />
        <InfoTile
          icon={<Clock size={18} className="text-violet-600" />}
          label="Schedule"
          value={meeting || 'Not set'}
          color="bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100"
        />
        <InfoTile
          icon={<Crown size={18} className="text-amber-600" />}
          label="Leader"
          value={g.leader ? `${g.leader.firstName} ${g.leader.lastName}` : 'Not assigned'}
          color="bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        />
      </div>

      {g.leader && (
        <Card className="mb-6 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Group leader</p>
          <div className="mt-3 flex items-center gap-4">
            <MemberAvatar
              photoUrl={g.leader.photoUrl}
              firstName={g.leader.firstName}
              lastName={g.leader.lastName}
              size="md"
            />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {g.leader.firstName} {g.leader.lastName}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {g.leader.phone ?? g.leader.email ?? '—'}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Members"
            description="People belonging to this group"
            action={
              canEdit && (
                <Button size="sm" onClick={() => { setSelectedMembers([]); setAddOpen(true); }}>
                  <UserPlus size={14} /> Add members
                </Button>
              )
            }
          />
          <Table>
            <thead>
              <tr>
                <SerialTh />
                <Th>Member</Th>
                <Th>Contact</Th>
                <Th>Status</Th>
                {canEdit && <Th className="text-right">Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {!g.members?.length && <EmptyRow colSpan={canEdit ? 5 : 4} message="No members yet." />}
              {g.members?.map((row: any, i: number) => {
                const m = row.member;
                const isLeader = g.leaderId === m.id;
                return (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <SerialTd index={i} />
                    <Td>
                      <Link href={`/members/${m.id}`} className="flex items-center gap-3">
                        <MemberAvatar photoUrl={m.photoUrl} firstName={m.firstName} lastName={m.lastName} />
                        <div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {m.firstName} {m.lastName}
                          </span>
                          {isLeader && (
                            <Badge tone="amber" className="ml-2">
                              Leader
                            </Badge>
                          )}
                          {m.membershipNumber && (
                            <p className="text-xs text-slate-400">{m.membershipNumber}</p>
                          )}
                        </div>
                      </Link>
                    </Td>
                    <Td>
                      <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        {m.phone && (
                          <p className="flex items-center gap-1.5">
                            <Phone size={13} /> {m.phone}
                          </p>
                        )}
                        {m.email && (
                          <p className="flex items-center gap-1.5">
                            <Mail size={13} /> {m.email}
                          </p>
                        )}
                        {!m.phone && !m.email && '—'}
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONES[m.status] ?? 'gray'}>{humanize(m.status)}</Badge>
                    </Td>
                    {canEdit && (
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          {!isLeader && (
                            <Button
                              size="sm"
                              variant="outline"
                              loading={setLeader.isPending}
                              onClick={() => setLeader.mutate(m.id)}
                            >
                              <Crown size={14} /> Make leader
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove ${m.firstName} from this group?`)) {
                                removeMember.mutate(m.id);
                              }
                            }}
                            className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </Td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>

        <Card className="overflow-hidden xl:col-span-2">
          <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4 dark:border-slate-800 dark:from-indigo-950/40 dark:to-slate-900">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <History size={18} className="text-indigo-600" /> Group activity
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Meetings, announcements, membership changes, and notes.
            </p>
            {canEdit && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={openMeetingModal}>
                  <CalendarDays size={14} /> Log meeting
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAnnouncementOpen(true)}>
                  <Megaphone size={14} /> Announce
                </Button>
                <Button size="sm" variant="outline" onClick={() => setNoteOpen(true)}>
                  <StickyNote size={14} /> Add note
                </Button>
              </div>
            )}
          </div>

          {!activities.length && (
            <div className="px-5 py-10 text-center">
              <History className="mx-auto mb-2 text-slate-200 dark:text-slate-700" size={36} />
              <p className="text-sm text-slate-400">No activity yet.</p>
              {canEdit && (
                <p className="mt-1 text-xs text-slate-500">Log a meeting or post an announcement to get started.</p>
              )}
            </div>
          )}

          {activities.length > 0 && (
            <div className="max-h-[32rem] overflow-y-auto">
              {groupedActivities.map((group) => (
                <div key={group.label}>
                  <p className="sticky top-0 z-10 bg-slate-50/95 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 backdrop-blur-sm dark:bg-slate-900/95">
                    {group.label}
                  </p>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.items.map((entry: any) => {
                      const style = ACTIVITY_STYLE[entry.type] ?? ACTIVITY_STYLE.NOTE;
                      const Icon = style.icon;
                      const meta = entry.metadata as Record<string, unknown> | null;
                      return (
                        <li key={entry.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedActivity(entry)}
                            className="flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 ${style.ring} ${style.bg}`}
                            >
                              <Icon size={16} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {entry.title}
                                </p>
                                <Badge tone={style.badge}>{humanize(entry.type)}</Badge>
                              </div>
                              {entry.description && (
                                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                                  {entry.description}
                                </p>
                              )}
                              {entry.type === 'MEETING_HELD' && meta?.attendeeCount != null && (
                                <p className="mt-1 text-xs text-sky-600 dark:text-sky-400">
                                  {String(meta.attendeeCount)} of {String(meta.totalMembers ?? '—')} members present
                                </p>
                              )}
                              <p className="mt-1 text-xs text-slate-400">
                                {formatDateTime(entry.createdAt)}
                                {entry.actorName ? ` · ${entry.actorName}` : ''}
                              </p>
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
        </Card>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit group" size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateGroup.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input label="Meeting day" value={form.meetingDay} onChange={(e) => setForm({ ...form, meetingDay: e.target.value })} />
            <Input label="Meeting time" value={form.meetingTime} onChange={(e) => setForm({ ...form, meetingTime: e.target.value })} />
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={updateGroup.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add members" size="lg">
        <MemberPicker
          branchId={g.branch?.id}
          selected={selectedMembers}
          onChange={setSelectedMembers}
          excludeIds={existingMemberIds}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setAddOpen(false)}>
            Cancel
          </Button>
          <Button
            loading={addMembers.isPending}
            disabled={!selectedMembers.length}
            onClick={() => addMembers.mutate()}
          >
            Add selected
          </Button>
        </div>
      </Modal>

      <Modal open={meetingOpen} onClose={() => setMeetingOpen(false)} title="Log group meeting" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Meeting title"
              value={meetingForm.title}
              onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
              required
            />
            <Input
              label="Topic"
              value={meetingForm.topic}
              onChange={(e) => setMeetingForm({ ...meetingForm, topic: e.target.value })}
            />
            <Input
              label="Date & time"
              type="datetime-local"
              value={meetingForm.heldAt}
              onChange={(e) => setMeetingForm({ ...meetingForm, heldAt: e.target.value })}
              required
            />
          </div>
          <Textarea
            label="Notes"
            value={meetingForm.notes}
            onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
            rows={3}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Attendance ({attendeeIds.length} selected)
            </p>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              {!g.members?.length && (
                <p className="p-2 text-sm text-slate-400">No members in this group yet.</p>
              )}
              {g.members?.map((row: any) => {
                const m = row.member;
                return (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <Checkbox
                      checked={attendeeIds.includes(m.id)}
                      onChange={() => toggleAttendee(m.id)}
                    />
                    <MemberAvatar firstName={m.firstName} lastName={m.lastName} />
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {m.firstName} {m.lastName}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMeetingOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={logMeeting.isPending}
              disabled={!meetingForm.title || !meetingForm.heldAt}
              onClick={() => logMeeting.mutate()}
            >
              Save meeting
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Add note" size="md">
        <div className="space-y-4">
          <Input
            label="Title"
            value={noteForm.title}
            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
            required
          />
          <Textarea
            label="Note"
            value={noteForm.body}
            onChange={(e) => setNoteForm({ ...noteForm, body: e.target.value })}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={addNote.isPending}
              disabled={!noteForm.title.trim()}
              onClick={() => addNote.mutate()}
            >
              Save note
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={announcementOpen} onClose={() => setAnnouncementOpen(false)} title="Post announcement" size="lg">
        <div className="space-y-4">
          <Input
            label="Title"
            value={announcementForm.title}
            onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
            required
          />
          <Textarea
            label="Message"
            value={announcementForm.body}
            onChange={(e) => setAnnouncementForm({ ...announcementForm, body: e.target.value })}
            rows={5}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAnnouncementOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={postAnnouncement.isPending}
              disabled={!announcementForm.title.trim() || !announcementForm.body.trim()}
              onClick={() => postAnnouncement.mutate()}
            >
              Post announcement
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        title="Activity details"
        size="lg"
      >
        {selectedActivity && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={ACTIVITY_STYLE[selectedActivity.type]?.badge ?? 'gray'}>
                {humanize(selectedActivity.type)}
              </Badge>
              <span className="text-sm text-slate-500">{formatDateTime(selectedActivity.createdAt)}</span>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Title</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {selectedActivity.title}
              </p>
            </div>

            {selectedActivity.description && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Details</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                  {selectedActivity.description}
                </p>
              </div>
            )}

            {selectedActivity.actorName && (
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/80">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Logged by</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {selectedActivity.actorName}
                </p>
              </div>
            )}

            {selectedActivity.type === 'MEETING_HELD' && selectedActivity.meeting && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Attendance</p>
                <div className="rounded-lg border border-slate-100 dark:border-slate-800">
                  {!selectedActivity.meeting.attendance?.length && (
                    <p className="p-4 text-sm text-slate-400">No attendance recorded.</p>
                  )}
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedActivity.meeting.attendance?.map((row: any) => (
                      <li key={row.memberId} className="flex items-center gap-3 px-4 py-2">
                        <MemberAvatar
                          photoUrl={row.member.photoUrl}
                          firstName={row.member.firstName}
                          lastName={row.member.lastName}
                        />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {row.member.firstName} {row.member.lastName}
                        </span>
                        <Badge tone="green" className="ml-auto">
                          Present
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {selectedActivity.type === 'LEADER_CHANGED' && selectedActivity.metadata && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/80">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Previous leader</p>
                  <p className="mt-1 text-sm font-medium">
                    {(selectedActivity.metadata as any).oldLeaderName ?? 'None'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/80">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">New leader</p>
                  <p className="mt-1 text-sm font-medium">
                    {(selectedActivity.metadata as any).newLeaderName ?? 'None'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
