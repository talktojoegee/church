'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle,
  Clock,
  Eye,
  MessageSquare,
  Repeat,
  Wallet,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranchQueryContext } from '@/lib/hooks';
import { Card, CardBody, CardHeader, ColorStatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SMS_WEEKDAYS } from '@/lib/sms-utils';

const STATUS_TONES: Record<string, 'amber' | 'green' | 'red' | 'gray' | 'blue'> = {
  ACTIVE: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'gray',
  FAILED: 'red',
};

interface ScheduleRow {
  id: string;
  senderId: string;
  message: string;
  recurrence: 'ONCE' | 'WEEKLY';
  recurrenceLabel: string;
  scheduledAt: string;
  nextRunAt: string;
  lastRunAt: string | null;
  lastRunError: string | null;
  status: string;
  createdBy: string | null;
  runCount: number;
}

interface ScheduleDetail extends ScheduleRow {
  pages: number;
  recipientCount: number;
  estimatedCost: number;
  phoneNumbersResolved: string;
  phoneGroups: { id: string; name: string }[];
  recurrenceDays: number[];
  createdAt: string;
  runs: {
    id: string;
    recipientCount: number;
    pages: number;
    cost: number;
    status: string;
    sentAt: string | null;
    createdAt: string;
  }[];
}

export function BulkSmsScheduledTab() {
  const qc = useQueryClient();
  const { branchId, params, queryEnabled } = useBranchQueryContext();
  const { hasPermission } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const schedulesQuery = useQuery({
    queryKey: ['bulksms-schedules', branchId],
    queryFn: async () => (await api.get('/bulksms/schedules', { params })).data,
    enabled: queryEnabled,
  });

  const detailQuery = useQuery({
    queryKey: ['bulksms-schedule', selectedId],
    queryFn: async () => (await api.get(`/bulksms/schedules/${selectedId}`)).data as ScheduleDetail,
    enabled: !!selectedId,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/bulksms/schedules/${id}/cancel`),
    meta: { successMessage: 'Schedule cancelled', errorMessage: 'Failed to cancel schedule' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulksms-schedules'] });
      qc.invalidateQueries({ queryKey: ['bulksms-schedule'] });
      setSelectedId(null);
    },
  });

  const rows: ScheduleRow[] = schedulesQuery.data?.items ?? [];
  const total = schedulesQuery.data?.total ?? 0;
  const summary = schedulesQuery.data?.summary ?? {
    active: 0,
    recurring: 0,
    once: 0,
    completed: 0,
  };
  const detail = detailQuery.data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ColorStatCard
          label="Total scheduled"
          value={total}
          icon={<CalendarClock size={20} />}
          color="blue"
        />
        <ColorStatCard
          label="Active"
          value={summary.active}
          icon={<Clock size={20} />}
          color="violet"
        />
        <ColorStatCard
          label="Recurring"
          value={summary.recurring}
          hint={`${summary.once} one-time`}
          icon={<Repeat size={20} />}
          color="amber"
        />
        <ColorStatCard
          label="Completed"
          value={summary.completed}
          icon={<CheckCircle size={20} />}
          color="emerald"
        />
      </div>

      <Card>
        <CardHeader
          title={`Scheduled SMS — ${total} total`}
          description="One-time and recurring messages waiting to send"
        />
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <SerialTh />
                <Th>Sender ID</Th>
                <Th>Message</Th>
                <Th>Schedule</Th>
                <Th>Next run</Th>
                <Th>Runs</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {schedulesQuery.isLoading && <EmptyRow colSpan={8} message="Loading…" />}
              {!schedulesQuery.isLoading && rows.length === 0 && (
                <EmptyRow colSpan={8} message="No scheduled messages yet." />
              )}
              {rows.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <SerialTd index={i} />
                  <Td className="font-semibold text-rose-700">{s.senderId}</Td>
                  <Td className="max-w-xs truncate text-slate-600">{s.message}</Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-sm text-slate-700">
                      <CalendarClock size={14} className="shrink-0 text-slate-400" />
                      <span>{s.recurrenceLabel}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      From {formatDate(s.scheduledAt, true)}
                    </p>
                    {s.lastRunError && (
                      <p className="mt-1 text-xs text-rose-600">{s.lastRunError}</p>
                    )}
                  </Td>
                  <Td>{formatDate(s.nextRunAt, true)}</Td>
                  <Td>{s.runCount}</Td>
                  <Td>
                    <Badge tone={STATUS_TONES[s.status] ?? 'gray'}>{s.status}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => setSelectedId(s.id)}>
                        <Eye size={14} /> View
                      </Button>
                      {hasPermission('comms.bulksms.send') && s.status === 'ACTIVE' && (
                        <Button
                          variant="outline"
                          size="sm"
                          loading={cancel.isPending && cancel.variables === s.id}
                          onClick={() => {
                            if (confirm('Cancel this scheduled SMS?')) cancel.mutate(s.id);
                          }}
                        >
                          <XCircle size={14} /> Cancel
                        </Button>
                      )}
                    </div>
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
        title="Schedule details"
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
              <ColorStatCard
                label="Pages"
                value={detail.pages}
                icon={<MessageSquare size={18} />}
                color="emerald"
                dense
              />
              <ColorStatCard
                label="Est. cost / run"
                value={formatCurrency(detail.estimatedCost)}
                icon={<Wallet size={18} />}
                color="amber"
                dense
              />
              <ColorStatCard
                label="Status"
                value={detail.status}
                icon={<CalendarClock size={18} />}
                color={
                  detail.status === 'ACTIVE'
                    ? 'violet'
                    : detail.status === 'COMPLETED'
                      ? 'emerald'
                      : detail.status === 'FAILED'
                        ? 'rose'
                        : 'blue'
                }
                dense
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sender ID</p>
                <p className="mt-1 font-semibold text-rose-700">{detail.senderId}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recurrence</p>
                <p className="mt-1 text-slate-900">{detail.recurrenceLabel}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scheduled from</p>
                <p className="mt-1 text-slate-900">{formatDate(detail.scheduledAt, true)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Next run</p>
                <p className="mt-1 text-slate-900">{formatDate(detail.nextRunAt, true)}</p>
              </div>
              {detail.lastRunAt && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last run</p>
                  <p className="mt-1 text-slate-900">{formatDate(detail.lastRunAt, true)}</p>
                </div>
              )}
              {detail.createdBy && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Created by</p>
                  <p className="mt-1 text-slate-900">{detail.createdBy}</p>
                </div>
              )}
              {detail.recurrence === 'WEEKLY' && detail.recurrenceDays.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Repeat days</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detail.recurrenceDays
                      .sort((a, b) => a - b)
                      .map((d) => (
                        <Badge key={d} tone="blue">
                          {SMS_WEEKDAYS.find((w) => w.value === d)?.label ?? d}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {detail.lastRunError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                Last run error: {detail.lastRunError}
              </div>
            )}

            {detail.phoneGroups.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Phone groups</p>
                <div className="flex flex-wrap gap-2">
                  {detail.phoneGroups.map((g) => (
                    <Badge key={g.id} tone="gray">{g.name}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Message</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 whitespace-pre-wrap">
                {detail.message}
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Recipients</p>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-700">
                {detail.phoneNumbersResolved || '—'}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Past runs ({detail.runs.length})</p>
              {detail.runs.length === 0 ? (
                <p className="text-sm text-slate-500">No runs yet.</p>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <SerialTh />
                      <Th>Recipients</Th>
                      <Th>Pages</Th>
                      <Th>Cost</Th>
                      <Th>Status</Th>
                      <Th>Sent at</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.runs.map((run, i) => (
                      <tr key={run.id}>
                        <SerialTd index={i} />
                        <Td>{run.recipientCount}</Td>
                        <Td>{run.pages}</Td>
                        <Td>{formatCurrency(run.cost)}</Td>
                        <Td>
                          <Badge tone={run.status === 'SENT' ? 'green' : 'red'}>{run.status}</Badge>
                        </Td>
                        <Td>{formatDate(run.sentAt ?? run.createdAt, true)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>

            {hasPermission('comms.bulksms.send') && detail.status === 'ACTIVE' && (
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  loading={cancel.isPending}
                  onClick={() => {
                    if (confirm('Cancel this scheduled SMS?')) cancel.mutate(detail.id);
                  }}
                >
                  <XCircle size={16} /> Cancel schedule
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
