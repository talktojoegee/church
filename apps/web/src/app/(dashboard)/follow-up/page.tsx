'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranches } from '@/lib/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { MemberPicker } from '@/components/members/MemberPicker';
import { UserPicker } from '@/components/users/UserPicker';
import { CONTENT_STATUS_TONES, FOLLOW_UP_STATUSES, FOLLOW_UP_TYPES, humanize } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

export default function FollowUpPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    branchId: '',
    title: '',
    objective: '',
    type: 'FIRST_TIMER',
    notes: '',
    dueDate: '',
    memberIds: [] as string[],
    assigneeIds: [] as string[],
  });

  const listQuery = useQuery({
    queryKey: ['follow-up-campaigns', statusFilter],
    queryFn: async () =>
      (await api.get('/follow-ups/campaigns', { params: statusFilter ? { status: statusFilter } : {} })).data,
  });

  const save = useMutation({
    mutationFn: () => api.post('/follow-ups/campaigns', form),
    meta: { successMessage: 'Campaign created', errorMessage: 'Failed to create campaign' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follow-up-campaigns'] });
      setOpen(false);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/follow-ups/campaigns/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['follow-up-campaigns'] }),
  });

  const openCreate = () => {
    const main = branches.data?.find((b) => b.isMain) ?? branches.data?.[0];
    setForm({
      branchId: main?.id ?? '',
      title: '',
      objective: '',
      type: 'FIRST_TIMER',
      notes: '',
      dueDate: '',
      memberIds: [],
      assigneeIds: [],
    });
    setError('');
    setOpen(true);
  };

  const rows = listQuery.data ?? [];
  const openCount = rows.filter((c: any) => c.status === 'OPEN').length;
  const inProgressCount = rows.filter((c: any) => c.status === 'IN_PROGRESS').length;

  return (
    <div>
      <PageHeader
        title="Follow-up"
        description="Create campaigns, select people by type, and track each contact."
        action={
          hasPermission('membership.followup.create') && (
            <Button onClick={openCreate}><Plus size={16} /> New Campaign</Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ColorStatCard label="Open campaigns" value={openCount} color="amber" icon={<Users size={22} />} />
        <ColorStatCard label="In progress" value={inProgressCount} color="blue" icon={<Users size={22} />} />
        <ColorStatCard label="Total campaigns" value={rows.length} color="violet" icon={<Users size={22} />} />
      </div>

      <div className="mb-4 sm:max-w-xs">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {FOLLOW_UP_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </Select>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <SerialTh />
              <Th>Title</Th>
              <Th>Type</Th>
              <Th>People</Th>
              <Th>Assigned</Th>
              <Th>Progress</Th>
              <Th>Due</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading && <EmptyRow colSpan={9} message="Loading…" />}
            {!listQuery.isLoading && rows.length === 0 && (
              <EmptyRow colSpan={9} message="No follow-up campaigns yet." />
            )}
            {rows.map((c: any, i: number) => {
              const done = c.recipients?.filter((r: any) => r.status === 'COMPLETED' || r.status === 'SKIPPED').length ?? 0;
              const total = c._count?.recipients ?? c.recipients?.length ?? 0;
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <SerialTd index={i} />
                  <Td>
                    <Link href={`/follow-up/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {c.title}
                    </Link>
                    {c.objective && <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{c.objective}</p>}
                  </Td>
                  <Td>{humanize(c.type)}</Td>
                  <Td>{total}</Td>
                  <Td>{c.assignees?.length ?? 0}</Td>
                  <Td>
                    <span className="text-sm">{done}/{total} done</span>
                  </Td>
                  <Td>{formatDate(c.dueDate)}</Td>
                  <Td>
                    <Badge tone={CONTENT_STATUS_TONES[c.status] ?? 'gray'}>{humanize(c.status)}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/follow-up/${c.id}`}>
                        <Button size="sm" variant="outline"><ChevronRight size={14} /></Button>
                      </Link>
                      {hasPermission('membership.followup.delete') && (
                        <button
                          onClick={() => { if (confirm('Delete this campaign?')) del.mutate(c.id); }}
                          className="rounded p-1.5 text-rose-400 hover:bg-rose-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Follow-up Campaign" size="xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            if (!form.memberIds.length) {
              setError('Select at least one person to follow up');
              return;
            }
            if (!form.assigneeIds.length) {
              setError('Select at least one responsible person');
              return;
            }
            save.mutate();
          }}
          className="space-y-4"
        >
          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. March First-Timer Outreach" />
          <Textarea label="Objective" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Describe the goal of this follow-up…" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select label="Branch" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value, memberIds: [], assigneeIds: [] })} required>
              {branches.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, memberIds: [] })}>
              {FOLLOW_UP_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
            </Select>
            <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes for the team…" />
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Responsible persons</p>
            <UserPicker
              branchId={form.branchId}
              selected={form.assigneeIds}
              onChange={(assigneeIds) => setForm({ ...form, assigneeIds })}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">People to follow up</p>
            <MemberPicker
              branchId={form.branchId}
              type={form.type}
              selected={form.memberIds}
              onChange={(memberIds) => setForm({ ...form, memberIds })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Create campaign</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
