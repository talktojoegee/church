'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranchQueryContext } from '@/lib/hooks';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';

const STATUS_TONES: Record<string, 'amber' | 'green' | 'red' | 'gray'> = {
  PENDING: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
};

export function BulkSmsSenderIdsTab() {
  const qc = useQueryClient();
  const { branchId, params, queryEnabled } = useBranchQueryContext();
  const { hasPermission } = useAuth();
  const [form, setForm] = useState({ senderId: '', purpose: '' });

  const listQuery = useQuery({
    queryKey: ['bulksms-sender-ids', branchId],
    queryFn: async () => (await api.get('/bulksms/sender-ids', { params })).data,
    enabled: queryEnabled,
  });

  const save = useMutation({
    mutationFn: () => api.post('/bulksms/sender-ids', { ...form, ...(branchId ? { branchId } : {}) }),
    meta: { successMessage: 'Sender ID submitted for approval', errorMessage: 'Failed to submit' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulksms-sender-ids'] });
      setForm({ senderId: '', purpose: '' });
    },
  });

  const refresh = useMutation({
    mutationFn: (id: string) => api.post(`/bulksms/sender-ids/${id}/refresh`),
    meta: { successMessage: 'Status refreshed', errorMessage: 'Failed to refresh' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bulksms-sender-ids'] }),
  });

  const rows = listQuery.data ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {hasPermission('comms.bulksms.manage') && (
        <Card>
          <CardHeader title="Register Sender ID" />
          <CardBody>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
              className="space-y-4"
            >
              <Input
                label="Sender ID"
                value={form.senderId}
                onChange={(e) => setForm({ ...form, senderId: e.target.value })}
                placeholder="Max 11 chars e.g. CHMS"
                maxLength={11}
                required
              />
              <p className="-mt-2 text-xs text-slate-500">Alphabetic, max 11 characters</p>
              <Textarea
                label="Purpose"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="Explain the purpose of this sender ID"
                required
              />
              <Button type="submit" loading={save.isPending} className="w-full">
                Submit for Approval
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      <Card className={hasPermission('comms.bulksms.manage') ? 'lg:col-span-2' : 'lg:col-span-3'}>
        <CardHeader title={`Your Sender IDs — ${rows.length}`} />
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <SerialTh />
                <Th>Sender ID</Th>
                <Th>Purpose</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading && <EmptyRow colSpan={6} message="Loading…" />}
              {!listQuery.isLoading && rows.length === 0 && (
                <EmptyRow colSpan={6} message="No sender IDs registered yet." />
              )}
              {rows.map((s: {
                id: string;
                senderId: string;
                purpose: string;
                status: string;
                createdAt: string;
              }, i: number) => (
                <tr key={s.id}>
                  <SerialTd index={i} />
                  <Td className="font-semibold text-rose-700">{s.senderId}</Td>
                  <Td className="max-w-xs truncate text-slate-500">{s.purpose}</Td>
                  <Td>
                    <Badge tone={STATUS_TONES[s.status] ?? 'gray'}>{s.status}</Badge>
                  </Td>
                  <Td>{formatDate(s.createdAt)}</Td>
                  <Td className="text-right">
                    {hasPermission('comms.bulksms.manage') && s.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => refresh.mutate(s.id)}
                        className="rounded p-1.5 text-brand-600 hover:bg-brand-50"
                        title="Refresh status"
                      >
                        <RefreshCw size={16} />
                      </button>
                    )}
                    {s.status === 'APPROVED' && (
                      <span className="inline-flex rounded p-1.5 text-emerald-500">
                        <Check size={16} />
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
