'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  HandHeart,
  CheckCircle,
  Clock,
  Target,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDefaultBranchId } from '@/lib/hooks';
import { Card, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { formatCurrency } from '@/lib/utils';
import { MemberSelect } from '@/components/members/MemberSelect';

export function PledgesTab() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branchId = useDefaultBranchId();
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');

  const blank = {
    branchId,
    campaign: '',
    amount: '',
    amountReceived: '',
    memberId: '',
    dueDate: '',
    note: '',
  };
  const [form, setForm] = useState(blank);

  const listQuery = useQuery({
    queryKey: ['pledges', branchId],
    queryFn: async () =>
      (await api.get('/finance/pledges', { params: branchId ? { branchId } : {} })).data,
  });

  const statsQuery = useQuery({
    queryKey: ['pledges-stats', branchId],
    queryFn: async () =>
      (await api.get('/finance/pledges/stats', { params: branchId ? { branchId } : {} })).data,
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        ...form,
        amount: Number(form.amount),
        amountReceived:
          form.amountReceived !== '' ? Number(form.amountReceived) : Number(form.amount),
        branchId: branchId || form.branchId,
      };
      if (!payload.memberId) delete payload.memberId;
      if (!payload.dueDate) delete payload.dueDate;
      return api.post('/finance/pledges', payload);
    },
    meta: { successMessage: 'Pledge created', errorMessage: 'Failed to save pledge' },
    onSuccess: () => {
      ['pledges', 'pledges-stats', 'finance-summary', 'contributions', 'contributions-stats', 'funds', 'funds-stats'].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
      setOpen(false);
    },
  });

  const pay = useMutation({
    mutationFn: () => {
      const newFulfilled = Number(payOpen.fulfilledAmount) + Number(payAmount);
      return api.patch(`/finance/pledges/${payOpen.id}`, { fulfilledAmount: newFulfilled });
    },
    meta: { successMessage: 'Payment recorded', errorMessage: 'Failed to record payment' },
    onSuccess: () => {
      ['pledges', 'pledges-stats', 'finance-summary', 'contributions', 'contributions-stats', 'funds', 'funds-stats'].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
      setPayOpen(null);
      setPayAmount('');
    },
  });

  const rows = listQuery.data ?? [];
  const stats = statsQuery.data;
  const fulfillmentPct =
    stats?.totalPledged > 0
      ? Math.round((stats.totalFulfilled / stats.totalPledged) * 100)
      : 0;

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <ColorStatCard
          label="Total pledged"
          value={formatCurrency(stats?.totalPledged ?? 0)}
          hint={`${stats?.total ?? 0} pledges`}
          icon={<HandHeart size={22} />}
          color="violet"
        />
        <ColorStatCard
          label="Fulfilled"
          value={formatCurrency(stats?.totalFulfilled ?? 0)}
          hint={`${stats?.fulfilledCount ?? 0} completed`}
          icon={<CheckCircle size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="Outstanding"
          value={formatCurrency(stats?.totalOutstanding ?? 0)}
          hint="Remaining balance"
          icon={<Target size={22} />}
          color="amber"
        />
        <ColorStatCard
          label="Active"
          value={stats?.active ?? 0}
          hint="In progress"
          icon={<Clock size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="Progress"
          value={`${fulfillmentPct}%`}
          hint="Overall fulfillment"
          icon={<Users size={22} />}
          color="indigo"
        />
      </div>

      <div className="mb-4 flex justify-end">
        {hasPermission('finance.pledge.create') && (
          <Button
            onClick={() => {
              setForm(blank);
              setOpen(true);
            }}
          >
            <Plus size={16} /> New Pledge
          </Button>
        )}
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <SerialTh />
              <Th>Campaign</Th>
              <Th>Member</Th>
              <Th>Pledged</Th>
              <Th>Fulfilled</Th>
              <Th>Progress</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading && <EmptyRow colSpan={8} message="Loading…" />}
            {!listQuery.isLoading && rows.length === 0 && (
              <EmptyRow colSpan={8} message="No pledges yet." />
            )}
            {rows.map((p: any, i: number) => {
              const pct =
                p.amount > 0 ? Math.min(100, Math.round((p.fulfilledAmount / p.amount) * 100)) : 0;
              return (
                <tr key={p.id}>
                  <SerialTd index={i} />
                  <Td className="font-medium text-slate-900">{p.campaign}</Td>
                  <Td>
                    {p.member ? (
                      `${p.member.firstName} ${p.member.lastName}`
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Td>
                  <Td>{formatCurrency(p.amount)}</Td>
                  <Td className="text-emerald-700">{formatCurrency(p.fulfilledAmount)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{pct}%</span>
                    </div>
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        p.status === 'FULFILLED' ? 'green' : p.status === 'CANCELLED' ? 'gray' : 'amber'
                      }
                    >
                      {p.status}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    {hasPermission('finance.pledge.update') && p.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPayOpen(p);
                          setPayAmount('');
                        }}
                      >
                        Record payment
                      </Button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Pledge" size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Campaign"
              value={form.campaign}
              onChange={(e) => setForm({ ...form, campaign: e.target.value })}
              placeholder="Building Project 2026"
              required
            />
            <Input
              label="Pledged amount"
              type="number"
              step="0.01"
              min={0}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
            <Input
              label="Amount received now"
              type="number"
              step="0.01"
              min={0}
              value={form.amountReceived}
              onChange={(e) => setForm({ ...form, amountReceived: e.target.value })}
              placeholder="Defaults to pledged amount"
            />
            <MemberSelect
              label="Member (optional)"
              branchId={branchId}
              value={form.memberId}
              onChange={(memberId) => setForm({ ...form, memberId })}
              allowAnonymous
            />
            <Input
              label="Due date (optional)"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <Input
            label="Note (optional)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              Create pledge
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!payOpen} onClose={() => setPayOpen(null)} title="Record Pledge Payment">
        {payOpen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              pay.mutate();
            }}
            className="space-y-4"
          >
            <p className="text-sm text-slate-500">
              {payOpen.campaign} · Outstanding: {formatCurrency(payOpen.outstanding)}
            </p>
            <Input
              label="Payment amount"
              type="number"
              step="0.01"
              min={0}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPayOpen(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={pay.isPending}>
                Record
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
