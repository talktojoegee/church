'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Megaphone,
  UserPlus,
  Trash2,
  Mail,
  MessageSquare,
  Shield,
  Crown,
  UserCog,
  ClipboardList,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { MemberPicker } from '@/components/members/MemberPicker';
import {
  DEPARTMENT_LEADERSHIP_ROLES,
  DEPARTMENT_ROLE_TONES,
  humanize,
} from '@/lib/constants';
import { formatDate } from '@/lib/utils';

function resolveLeadership(members: any[] | undefined, leader: any) {
  const byRole = (role: string) => members?.find((m) => m.role === role)?.member ?? null;
  return {
    hod: byRole('HOD') ?? leader ?? null,
    assistant: byRole('ASSISTANT'),
    secretary: byRole('SECRETARY'),
  };
}

const LEADERSHIP_CARD_KEYS = {
  HOD: 'hod',
  ASSISTANT: 'assistant',
  SECRETARY: 'secretary',
} as const;

const ROLE_OPTIONS = [
  {
    value: 'HOD',
    label: 'Head of Department',
    description: 'Leads the department. Only one HOD at a time.',
    icon: Crown,
    tone: 'brand' as const,
  },
  {
    value: 'ASSISTANT',
    label: 'Assistant',
    description: 'Supports the HOD. Only one assistant at a time.',
    icon: UserCog,
    tone: 'blue' as const,
  },
  {
    value: 'SECRETARY',
    label: 'Secretary',
    description: 'Handles records and communication. Only one secretary at a time.',
    icon: ClipboardList,
    tone: 'amber' as const,
  },
  {
    value: 'MEMBER',
    label: 'Member',
    description: 'Regular department participant.',
    icon: Users,
    tone: 'gray' as const,
  },
];

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function channelLabel(channel: string) {
  if (channel === 'EMAIL') return 'Email';
  if (channel === 'SMS') return 'SMS';
  return 'Email & SMS';
}

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceForm, setAnnounceForm] = useState({ title: '', message: '', channel: 'BOTH' });
  const [roleMember, setRoleMember] = useState<any | null>(null);
  const [pendingRole, setPendingRole] = useState('MEMBER');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);

  const deptQuery = useQuery({
    queryKey: ['department', id],
    queryFn: async () => (await api.get(`/departments/${id}`)).data,
  });

  const assignRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) =>
      (await api.patch(`/departments/${id}/members/${memberId}/role`, { role })).data,
    meta: { successMessage: 'Role updated', errorMessage: 'Failed to update role' },
    onSuccess: (data) => {
      qc.setQueryData(['department', id], data);
      qc.invalidateQueries({ queryKey: ['department', id] });
      qc.invalidateQueries({ queryKey: ['departments'] });
      setRoleMember(null);
    },
  });

  const openRoleModal = (row: any) => {
    setRoleMember(row);
    setPendingRole(row.role);
  };

  const removeMember = useMutation({
    mutationFn: (memberId: string) => api.delete(`/departments/${id}/members/${memberId}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['department', id] }),
  });

  const addMembers = useMutation({
    mutationFn: async () => {
      for (const memberId of selectedMembers) {
        await api.post(`/departments/${id}/members/${memberId}`);
      }
    },
    meta: { successMessage: 'Members added', errorMessage: 'Failed to add members' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['department', id] });
      qc.invalidateQueries({ queryKey: ['departments'] });
      setAddMembersOpen(false);
      setSelectedMembers([]);
    },
  });

  const publish = useMutation({
    mutationFn: () => api.post(`/departments/${id}/announcements`, announceForm),
    meta: { skipSuccessToast: true, errorMessage: 'Failed to send announcement' },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['department', id] });
      toast.success(`Sent to ${res.data.sent} of ${res.data.attempted} member(s).`);
      setAnnounceForm({ title: '', message: '', channel: 'BOTH' });
      setAnnounceOpen(false);
    },
  });

  if (deptQuery.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  const d = deptQuery.data;
  if (!d) return <p className="text-sm text-slate-500">Department not found.</p>;

  const leadership = resolveLeadership(d.members, d.leader);
  const canEdit = hasPermission('org.department.update');

  return (
    <div>
      <Link
        href="/departments"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> Back to departments
      </Link>

      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <p className="text-sm text-white/70">{d.branch?.name}</p>
        <h1 className="mt-1 text-2xl font-bold">{d.name}</h1>
        {d.description && <p className="mt-2 max-w-2xl text-sm text-white/85">{d.description}</p>}
        <p className="mt-3 text-sm text-white/70">{d._count?.members ?? 0} members</p>
      </div>

      {/* Leadership */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {DEPARTMENT_LEADERSHIP_ROLES.map((role) => {
          const person = leadership[LEADERSHIP_CARD_KEYS[role]];
          return (
            <Card key={role} className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{humanize(role)}</p>
              {person ? (
                <div className="mt-3 flex items-center gap-3">
                  <MemberAvatar
                    photoUrl={person.photoUrl}
                    firstName={person.firstName}
                    lastName={person.lastName}
                  />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {person.firstName} {person.lastName}
                    </p>
                    <p className="text-xs text-slate-400">{person.phone ?? person.email ?? '—'}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">Not assigned</p>
              )}
              <p className="mt-2 text-[11px] text-slate-400">Only one active {humanize(role)} at a time</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Members */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Members"
            description="Tap the shield icon to assign or change a member's role"
            action={
              canEdit && (
                <Button size="sm" onClick={() => setAddMembersOpen(true)}>
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
                {canEdit && <Th className="w-28 text-right">Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {!d.members?.length && <EmptyRow colSpan={canEdit ? 3 : 2} message="No members yet." />}
              {d.members?.map((row: any, i: number) => (
                <tr key={row.member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <SerialTd index={i} />
                  <Td>
                    <Link href={`/members/${row.member.id}`} className="flex items-center gap-3">
                      <MemberAvatar
                        photoUrl={row.member.photoUrl}
                        firstName={row.member.firstName}
                        lastName={row.member.lastName}
                      />
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {row.member.firstName} {row.member.lastName}
                        </span>
                        <div className="mt-1">
                          <Badge tone={DEPARTMENT_ROLE_TONES[row.role] ?? 'gray'}>{humanize(row.role)}</Badge>
                        </div>
                      </div>
                    </Link>
                  </Td>
                  {canEdit && (
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openRoleModal(row)}
                          className="rounded-lg p-2 text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
                          title="Manage role"
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Remove this member from the department?')) {
                              removeMember.mutate(row.member.id);
                            }
                          }}
                          className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Remove member"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader
            title="Announcements"
            description="Notify all department members"
            action={
              canEdit && (
                <Button size="sm" variant="outline" onClick={() => setAnnounceOpen(true)}>
                  <Megaphone size={14} /> Publish
                </Button>
              )
            }
          />
          <CardBody className="max-h-96 space-y-3 overflow-y-auto pt-2">
            {!d.announcements?.length && (
              <p className="text-center text-sm text-slate-400">No announcements sent yet.</p>
            )}
            {d.announcements?.map((a: any) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAnnouncement(a)}
                className="w-full rounded-lg border border-slate-100 p-3 text-left transition hover:border-brand-200 hover:bg-brand-50/40 dark:border-slate-800 dark:hover:border-brand-500/40 dark:hover:bg-brand-950/20"
              >
                <p className="font-medium text-slate-900 dark:text-slate-100">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{a.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span>{formatDate(a.createdAt)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    {a.channel === 'EMAIL' && <Mail size={11} />}
                    {a.channel === 'SMS' && <MessageSquare size={11} />}
                    {a.channel === 'BOTH' && (
                      <>
                        <Mail size={11} />
                        <MessageSquare size={11} />
                      </>
                    )}
                    {a.recipientCount} sent
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-brand-600 dark:text-brand-400">View details →</p>
              </button>
            ))}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={!!roleMember}
        onClose={() => setRoleMember(null)}
        title="Manage department role"
        size="lg"
      >
        {roleMember && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/80">
              <MemberAvatar
                photoUrl={roleMember.member.photoUrl}
                firstName={roleMember.member.firstName}
                lastName={roleMember.member.lastName}
                size="md"
              />
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {roleMember.member.firstName} {roleMember.member.lastName}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Current role: {humanize(roleMember.role)}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              Choose a role for this member. Leadership roles can only be held by one person at a time —
              assigning a role here will move it from anyone else who currently holds it.
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ROLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = pendingRole === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPendingRole(opt.value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/30 dark:border-brand-400 dark:bg-brand-950/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <Icon size={18} />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{opt.label}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{opt.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRoleMember(null)}>
                Cancel
              </Button>
              <Button
                loading={assignRole.isPending}
                disabled={pendingRole === roleMember.role}
                onClick={() =>
                  assignRole.mutate({ memberId: roleMember.member.id, role: pendingRole })
                }
              >
                Save role
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
        title="Announcement details"
        size="lg"
      >
        {selectedAnnouncement && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Title</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {selectedAnnouncement.title}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/80">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sent on</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {formatDateTime(selectedAnnouncement.createdAt)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/80">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Channel</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {selectedAnnouncement.channel === 'EMAIL' && <Mail size={14} />}
                  {selectedAnnouncement.channel === 'SMS' && <MessageSquare size={14} />}
                  {selectedAnnouncement.channel === 'BOTH' && (
                    <>
                      <Mail size={14} />
                      <MessageSquare size={14} />
                    </>
                  )}
                  {channelLabel(selectedAnnouncement.channel)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/80">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Recipients</p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                {selectedAnnouncement.recipientCount} member(s) notified
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {selectedAnnouncement.message}
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setSelectedAnnouncement(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={addMembersOpen} onClose={() => setAddMembersOpen(false)} title="Add members" size="lg">
        <MemberPicker
          branchId={d.branch?.id}
          selected={selectedMembers}
          onChange={setSelectedMembers}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setAddMembersOpen(false)}>Cancel</Button>
          <Button
            onClick={() => addMembers.mutate()}
            loading={addMembers.isPending}
            disabled={!selectedMembers.length}
          >
            Add selected
          </Button>
        </div>
      </Modal>

      <Modal open={announceOpen} onClose={() => setAnnounceOpen(false)} title="Publish announcement" size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            publish.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Title"
            value={announceForm.title}
            onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })}
            required
          />
          <Textarea
            label="Message"
            value={announceForm.message}
            onChange={(e) => setAnnounceForm({ ...announceForm, message: e.target.value })}
            required
            rows={4}
          />
          <Select
            label="Send via"
            value={announceForm.channel}
            onChange={(e) => setAnnounceForm({ ...announceForm, channel: e.target.value })}
          >
            <option value="BOTH">Email & SMS</option>
            <option value="EMAIL">Email only</option>
            <option value="SMS">SMS only</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAnnounceOpen(false)}>Cancel</Button>
            <Button type="submit" loading={publish.isPending}>
              <Megaphone size={14} /> Send to members
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
