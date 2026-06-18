'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, MessageSquare, Send, Users, Wallet, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useBranchQueryContext } from '@/lib/hooks';
import { Card, CardBody, CardHeader, ColorStatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';

function recipientStatusTone(status: string): 'green' | 'red' | 'amber' | 'gray' {
  const s = status.toLowerCase();
  if (s.includes('success') || s.includes('sent') || s.includes('deliver')) return 'green';
  if (s.includes('fail') || s.includes('reject') || s.includes('error')) return 'red';
  if (s.includes('pend') || s.includes('queue')) return 'amber';
  return 'gray';
}

interface MessageDetail {
  id: string;
  senderIdLabel: string;
  message: string;
  pages: number;
  recipientCount: number;
  cost: number;
  status: string;
  gateway: string | null;
  sentAt: string | null;
  createdAt: string;
  sentBy: string | null;
  recipients: { phone: string; status: string; detail?: string }[];
}

export function BulkSmsHistoryTab() {
  const { branchId, params, queryEnabled } = useBranchQueryContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ['bulksms-history', branchId],
    queryFn: async () => (await api.get('/bulksms/history', { params })).data,
    enabled: queryEnabled,
  });

  const detailQuery = useQuery({
    queryKey: ['bulksms-message', selectedId],
    queryFn: async () => (await api.get(`/bulksms/history/${selectedId}`)).data as MessageDetail,
    enabled: !!selectedId,
  });

  const rows = historyQuery.data?.items ?? [];
  const total = historyQuery.data?.total ?? 0;
  const summary = historyQuery.data?.summary ?? {
    sent: 0,
    failed: 0,
    totalCost: 0,
    totalRecipients: 0,
  };
  const detail = detailQuery.data;

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ColorStatCard
          label="Total messages"
          value={total}
          icon={<MessageSquare size={20} />}
          color="blue"
        />
        <ColorStatCard
          label="Sent"
          value={summary.sent}
          hint={summary.failed > 0 ? `${summary.failed} failed` : undefined}
          icon={<Send size={20} />}
          color="emerald"
        />
        <ColorStatCard
          label="Recipients"
          value={summary.totalRecipients}
          icon={<Users size={20} />}
          color="violet"
        />
        <ColorStatCard
          label="Total spent"
          value={formatCurrency(summary.totalCost)}
          icon={<Wallet size={20} />}
          color="amber"
        />
      </div>

      <Card>
        <CardHeader title={`Sent Messages — ${total} total`} />
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <SerialTh />
                <Th>Sender ID</Th>
                <Th>Message</Th>
                <Th>Recipients</Th>
                <Th>Pages</Th>
                <Th>Cost</Th>
                <Th>Status</Th>
                <Th>Sent at</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {historyQuery.isLoading && <EmptyRow colSpan={9} message="Loading…" />}
              {!historyQuery.isLoading && rows.length === 0 && (
                <EmptyRow colSpan={9} message="No messages sent yet." />
              )}
              {rows.map((m: {
                id: string;
                senderIdLabel: string;
                message: string;
                recipientCount: number;
                pages: number;
                cost: number;
                status: string;
                sentAt: string | null;
                createdAt: string;
              }, i: number) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <SerialTd index={i} />
                  <Td className="font-medium text-rose-700">{m.senderIdLabel}</Td>
                  <Td className="max-w-xs truncate text-slate-600">{m.message}</Td>
                  <Td>{m.recipientCount}</Td>
                  <Td>{m.pages}</Td>
                  <Td>{formatCurrency(m.cost)}</Td>
                  <Td>
                    <Badge tone={m.status === 'SENT' ? 'green' : 'red'}>{m.status}</Badge>
                  </Td>
                  <Td>{formatDate(m.sentAt ?? m.createdAt)}</Td>
                  <Td className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedId(m.id)}>
                      <Eye size={14} /> View
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Modal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title="Message details"
        size="xl"
      >
        {detailQuery.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <ColorStatCard
                label="Recipients"
                value={detail.recipientCount}
                icon={<MessageSquare size={18} />}
                color="blue"
                dense
              />
              <ColorStatCard label="Pages" value={detail.pages} icon={<MessageSquare size={18} />} color="emerald" dense />
              <ColorStatCard label="Total cost" value={formatCurrency(detail.cost)} icon={<MessageSquare size={18} />} color="amber" dense />
              <ColorStatCard
                label="Status"
                value={detail.status}
                icon={<MessageSquare size={18} />}
                color={detail.status === 'SENT' ? 'emerald' : 'rose'}
                dense
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sender ID</p>
                <p className="mt-1 font-semibold text-rose-700">{detail.senderIdLabel}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sent at</p>
                <p className="mt-1 text-slate-900">{formatDate(detail.sentAt ?? detail.createdAt)}</p>
              </div>
              {detail.sentBy && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sent by</p>
                  <p className="mt-1 text-slate-900">{detail.sentBy}</p>
                </div>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Message</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 whitespace-pre-wrap">
                {detail.message}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Recipients</p>
              <Table>
                <thead>
                  <tr>
                    <SerialTh />
                    <Th>Phone number</Th>
                    <Th>Status</Th>
                    <Th>Detail</Th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recipients.map((r, i) => (
                    <tr key={`${r.phone}-${i}`}>
                      <SerialTd index={i} />
                      <Td className="font-mono text-sm">{r.phone}</Td>
                      <Td>
                        <Badge tone={recipientStatusTone(r.status)}>{r.status}</Badge>
                      </Td>
                      <Td className="text-slate-500">{r.detail ?? '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
