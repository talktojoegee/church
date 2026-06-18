'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, Trash2, Mail, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranches } from '@/lib/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { MemberPicker } from '@/components/members/MemberPicker';
import { BulkSmsComposeTab } from '@/components/bulksms/ComposeTab';
import { BulkSmsHistoryTab } from '@/components/bulksms/HistoryTab';
import { BulkSmsScheduledTab } from '@/components/bulksms/ScheduledTab';
import { BulkSmsPhoneGroupsTab } from '@/components/bulksms/PhoneGroupsTab';
import { BulkSmsSenderIdsTab } from '@/components/bulksms/SenderIdsTab';
import { BulkSmsWalletTab } from '@/components/bulksms/WalletTab';
import { CONTENT_STATUS_TONES, MESSAGE_CHANNELS, humanize } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

const MAIN_TABS = [
  { id: 'compose', label: 'Compose SMS' },
  { id: 'scheduled', label: 'Scheduled SMS' },
  { id: 'history', label: 'SMS History' },
  { id: 'phone-groups', label: 'Phone Groups' },
  { id: 'sender-ids', label: 'Sender IDs' },
  { id: 'wallet', label: 'SMS Wallet' },
  { id: 'broadcast', label: 'Email Broadcast' },
  { id: 'templates', label: 'Templates' },
];

export default function CommunicationPage() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const initialTab = searchParams.get('tab') ?? 'compose';
  const [tab, setTab] = useState(initialTab);
  const [sendOpen, setSendOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [sendForm, setSendForm] = useState({
    branchId: '',
    channel: 'EMAIL',
    subject: '',
    body: '',
  });
  const [tplForm, setTplForm] = useState({ name: '', channel: 'EMAIL', subject: '', body: '', category: '' });

  useEffect(() => {
    const q = searchParams.get('tab');
    if (q) setTab(q);
  }, [searchParams]);

  const visibleTabs = MAIN_TABS.filter((t) => {
    if (['compose', 'scheduled', 'history', 'phone-groups', 'sender-ids', 'wallet'].includes(t.id)) {
      return hasPermission('comms.bulksms.view');
    }
    if (t.id === 'wallet') return hasPermission('comms.bulksms.wallet');
    return true;
  });

  const messagesQuery = useQuery({
    queryKey: ['messages'],
    queryFn: async () => (await api.get('/comms/messages')).data,
    enabled: tab === 'broadcast',
  });
  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await api.get('/comms/templates')).data,
    enabled: tab === 'templates',
  });

  const send = useMutation({
    mutationFn: () =>
      api.post('/comms/messages/send', {
        ...sendForm,
        memberIds: selectedMembers,
      }),
    meta: { successMessage: 'Message sent', errorMessage: 'Failed to send message' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
      setSendOpen(false);
      setSelectedMembers([]);
    },
  });

  const saveTpl = useMutation({
    mutationFn: () => api.post('/comms/templates', tplForm),
    meta: { successMessage: 'Template saved', errorMessage: 'Failed to save template' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      setTplOpen(false);
    },
  });

  const delTpl = useMutation({
    mutationFn: (id: string) => api.delete(`/comms/templates/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  const openSend = () => {
    const main = branches.data?.find((b) => b.isMain) ?? branches.data?.[0];
    setSendForm({ branchId: main?.id ?? '', channel: 'EMAIL', subject: '', body: '' });
    setSelectedMembers([]);
    setSendOpen(true);
  };

  const applyTemplate = (tpl: { channel: string; subject?: string; body: string }) => {
    setSendForm((f) => ({
      ...f,
      channel: tpl.channel,
      subject: tpl.subject ?? '',
      body: tpl.body,
    }));
    setSendOpen(true);
  };

  type BroadcastRow = {
    id: string;
    subject?: string;
    body: string;
    channel: string;
    sentCount: number;
    recipientCount: number;
    failedCount: number;
    status: string;
    sentAt?: string;
    createdAt: string;
  };

  const broadcasts: BroadcastRow[] = messagesQuery.data ?? [];
  const broadcastStats = {
    total: broadcasts.length,
    delivered: broadcasts.reduce((n, m) => n + m.sentCount, 0),
    recipients: broadcasts.reduce((n, m) => n + m.recipientCount, 0),
    failed: broadcasts.reduce((n, m) => n + m.failedCount, 0),
  };

  return (
    <div>
      <PageHeader
        title="Communication"
        description="Bulk SMS, wallet top-up, and email broadcasts to members."
        action={
          tab === 'broadcast' && hasPermission('comms.message.create') ? (
            <Button onClick={openSend}>
              <Send size={16} /> New Broadcast
            </Button>
          ) : undefined
        }
      />

      <Tabs tabs={visibleTabs} active={tab} onChange={setTab} />

      <div className="mt-6">
        {tab === 'compose' && hasPermission('comms.bulksms.view') && <BulkSmsComposeTab />}
        {tab === 'scheduled' && hasPermission('comms.bulksms.view') && <BulkSmsScheduledTab />}
        {tab === 'history' && hasPermission('comms.bulksms.view') && <BulkSmsHistoryTab />}
        {tab === 'phone-groups' && hasPermission('comms.bulksms.view') && <BulkSmsPhoneGroupsTab />}
        {tab === 'sender-ids' && hasPermission('comms.bulksms.view') && <BulkSmsSenderIdsTab />}
        {tab === 'wallet' && hasPermission('comms.bulksms.view') && <BulkSmsWalletTab />}
      </div>

      {tab === 'broadcast' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ColorStatCard
              label="Broadcasts"
              value={broadcastStats.total}
              icon={<Mail size={20} />}
              color="blue"
            />
            <ColorStatCard
              label="Delivered"
              value={broadcastStats.delivered}
              icon={<CheckCircle size={20} />}
              color="emerald"
            />
            <ColorStatCard
              label="Recipients"
              value={broadcastStats.recipients}
              icon={<Users size={20} />}
              color="violet"
            />
            <ColorStatCard
              label="Failed"
              value={broadcastStats.failed}
              icon={<AlertCircle size={20} />}
              color={broadcastStats.failed > 0 ? 'rose' : 'emerald'}
            />
          </div>

          <Card>
          <Table>
            <thead>
              <tr>
                <SerialTh />
                <Th>Subject / Preview</Th>
                <Th>Channel</Th>
                <Th>Recipients</Th>
                <Th>Status</Th>
                <Th>Sent</Th>
              </tr>
            </thead>
            <tbody>
              {messagesQuery.isLoading && <EmptyRow colSpan={6} message="Loading…" />}
              {!messagesQuery.isLoading && !messagesQuery.data?.length && (
                <EmptyRow colSpan={6} message="No messages sent yet." />
              )}
              {broadcasts.map((m, i) => (
                <tr key={m.id}>
                  <SerialTd index={i} />
                  <Td>
                    <span className="font-medium text-slate-900">{m.subject ?? m.body.slice(0, 50)}</span>
                  </Td>
                  <Td>
                    <Badge tone="blue">{m.channel}</Badge>
                  </Td>
                  <Td>
                    {m.sentCount}/{m.recipientCount}
                    {m.failedCount > 0 && (
                      <span className="ml-1 text-xs text-rose-500">({m.failedCount} failed)</span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={CONTENT_STATUS_TONES[m.status] ?? 'gray'}>{humanize(m.status)}</Badge>
                  </Td>
                  <Td>{formatDate(m.sentAt ?? m.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        </div>
      )}

      {tab === 'templates' && (
        <div>
          {hasPermission('comms.template.create') && (
            <div className="mb-4">
              <Button
                variant="outline"
                onClick={() => {
                  setTplForm({ name: '', channel: 'EMAIL', subject: '', body: '', category: '' });
                  setTplOpen(true);
                }}
              >
                <Plus size={16} /> New Template
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templatesQuery.data?.map((t: {
              id: string;
              name: string;
              channel: string;
              subject?: string;
              body: string;
            }) => (
              <Card key={t.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{t.name}</h3>
                    <Badge tone="blue" className="mt-1">{t.channel}</Badge>
                  </div>
                  <div className="flex gap-1">
                    {hasPermission('comms.message.create') && (
                      <button
                        onClick={() => applyTemplate(t)}
                        className="rounded p-1.5 text-brand-600 hover:bg-brand-50"
                      >
                        <Send size={15} />
                      </button>
                    )}
                    {hasPermission('comms.template.delete') && (
                      <button
                        onClick={() => {
                          if (confirm('Delete template?')) delTpl.mutate(t.id);
                        }}
                        className="rounded p-1.5 text-rose-400 hover:bg-rose-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
                {t.subject && <p className="mt-2 text-sm font-medium text-slate-700">{t.subject}</p>}
                <p className="mt-1 line-clamp-3 text-sm text-slate-500">{t.body}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal open={sendOpen} onClose={() => setSendOpen(false)} title="Send Broadcast" size="xl">
        <form onSubmit={(e) => { e.preventDefault(); send.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Channel" value={sendForm.channel} onChange={(e) => setSendForm({ ...sendForm, channel: e.target.value })}>
              {MESSAGE_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            {(branches.data?.length ?? 0) > 1 && (
              <Select label="Branch" value={sendForm.branchId} onChange={(e) => setSendForm({ ...sendForm, branchId: e.target.value })} required>
                {branches.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            )}
          </div>
          {sendForm.channel === 'EMAIL' && (
            <Input label="Subject" value={sendForm.subject} onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })} />
          )}
          <Textarea label="Message" value={sendForm.body} onChange={(e) => setSendForm({ ...sendForm, body: e.target.value })} required rows={5} />
          <MemberPicker
            branchId={sendForm.branchId}
            selected={selectedMembers}
            onChange={setSelectedMembers}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
            <Button type="submit" loading={send.isPending}><Send size={16} /> Send</Button>
          </div>
        </form>
      </Modal>

      <Modal open={tplOpen} onClose={() => setTplOpen(false)} title="New Template" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); saveTpl.mutate(); }} className="space-y-4">
          <Input label="Name" value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} required />
          <Select label="Channel" value={tplForm.channel} onChange={(e) => setTplForm({ ...tplForm, channel: e.target.value })}>
            {MESSAGE_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          {tplForm.channel === 'EMAIL' && (
            <Input label="Subject" value={tplForm.subject} onChange={(e) => setTplForm({ ...tplForm, subject: e.target.value })} />
          )}
          <Textarea label="Body" value={tplForm.body} onChange={(e) => setTplForm({ ...tplForm, body: e.target.value })} required />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setTplOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saveTpl.isPending}>Save template</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
