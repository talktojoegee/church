'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Eye, Send, Wallet, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranchQueryContext } from '@/lib/hooks';
import { Card, CardBody, CardHeader, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { cn, formatCurrency } from '@/lib/utils';
import { DEFAULT_SENDER_ID, SMS_WEEKDAYS, smsPages } from '@/lib/sms-utils';

type DeliveryMode = 'instant' | 'schedule';
type RecurrenceMode = 'once' | 'weekly';

interface PreviewData {
  senderId: string;
  message: string;
  phoneNumbers: string;
  persons: number;
  pages: number;
  retailPrice: number;
  networkSummary: Record<string, number>;
  walletBalance: number;
  hasEnoughBalance: boolean;
  shortfall: number;
}

function defaultScheduledAt(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BulkSmsComposeTab() {
  const qc = useQueryClient();
  const { branchId, params, queryEnabled } = useBranchQueryContext();
  const { hasPermission } = useAuth();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [form, setForm] = useState({
    senderId: DEFAULT_SENDER_ID,
    phoneGroupIds: [] as string[],
    phoneNumbers: '',
    message: '',
    deliveryMode: 'instant' as DeliveryMode,
    scheduledAt: defaultScheduledAt(),
    recurrenceMode: 'once' as RecurrenceMode,
    recurrenceDays: [] as number[],
  });

  const walletQuery = useQuery({
    queryKey: ['bulksms-wallet', branchId],
    queryFn: async () => (await api.get('/bulksms/wallet', { params })).data,
    enabled: queryEnabled,
  });
  const groupsQuery = useQuery({
    queryKey: ['bulksms-groups', branchId],
    queryFn: async () => (await api.get('/bulksms/phone-groups', { params })).data,
    enabled: queryEnabled,
  });
  const senderIdsQuery = useQuery({
    queryKey: ['bulksms-sender-ids', branchId],
    queryFn: async () => (await api.get('/bulksms/sender-ids', { params })).data,
    enabled: queryEnabled,
  });

  const previewMutation = useMutation({
    mutationFn: () =>
      api.post('/bulksms/preview', {
        message: form.message,
        senderId: form.senderId,
        phoneNumbers: form.phoneNumbers.trim() || undefined,
        phoneGroupIds: form.phoneGroupIds.length ? form.phoneGroupIds : undefined,
        ...(branchId ? { branchId } : {}),
      }),
    meta: { errorMessage: 'Failed to preview message' },
    onSuccess: (res) => setPreview(res.data),
  });

  const sendMutation = useMutation({
    mutationFn: (data: PreviewData) =>
      api.post('/bulksms/send', {
        message: data.message,
        senderId: data.senderId,
        ...(branchId ? { branchId } : {}),
        retailPrice: data.retailPrice,
        pages: data.pages,
        persons: data.persons,
        phoneNumbersResolved: data.phoneNumbers,
      }),
    meta: { successMessage: 'Message sent successfully', errorMessage: 'Failed to send message' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulksms-history'] });
      qc.invalidateQueries({ queryKey: ['bulksms-wallet'] });
      resetForm();
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: PreviewData) =>
      api.post('/bulksms/schedule', {
        message: data.message,
        senderId: data.senderId,
        ...(branchId ? { branchId } : {}),
        phoneGroupIds: form.phoneGroupIds.length ? form.phoneGroupIds : undefined,
        phoneNumbers: form.phoneNumbers.trim() || undefined,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        recurrence: form.recurrenceMode === 'weekly' ? 'WEEKLY' : 'ONCE',
        recurrenceDays: form.recurrenceMode === 'weekly' ? form.recurrenceDays : undefined,
      }),
    meta: { successMessage: 'SMS scheduled successfully', errorMessage: 'Failed to schedule message' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulksms-schedules'] });
      qc.invalidateQueries({ queryKey: ['bulksms-wallet'] });
      resetForm();
    },
  });

  const resetForm = () => {
    setPreview(null);
    setForm({
      senderId: DEFAULT_SENDER_ID,
      phoneGroupIds: [],
      phoneNumbers: '',
      message: '',
      deliveryMode: 'instant',
      scheduledAt: defaultScheduledAt(),
      recurrenceMode: 'once',
      recurrenceDays: [],
    });
  };

  const toggleRecurrenceDay = (day: number) => {
    setForm((f) => ({
      ...f,
      recurrenceDays: f.recurrenceDays.includes(day)
        ? f.recurrenceDays.filter((d) => d !== day)
        : [...f.recurrenceDays, day],
    }));
  };

  const pages = smsPages(form.message);
  const approvedSenders = (senderIdsQuery.data ?? []).filter(
    (s: { status: string }) => s.status === 'APPROVED',
  );
  const phoneGroupOptions = (groupsQuery.data ?? []).map(
    (g: { id: string; name: string; contactCount: number }) => ({
      value: g.id,
      label: `${g.name} (${g.contactCount})`,
    }),
  );

  const scheduleValid =
    form.deliveryMode === 'instant' ||
    (form.scheduledAt &&
      (form.recurrenceMode === 'once' || form.recurrenceDays.length > 0));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-brand-100 bg-gradient-to-br from-brand-50 to-white">
          <CardBody className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Wallet size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">SMS Wallet Balance</p>
              <p className="text-xl font-bold text-brand-700">
                {formatCurrency(walletQuery.data?.balance ?? 0)}
              </p>
            </div>
            {hasPermission('comms.bulksms.wallet') && (
              <Link href="/communication?tab=wallet">
                <Button variant="outline" size="sm">Top Up</Button>
              </Link>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Compose Message" description="Send instantly or schedule one-time / recurring SMS" />
        <CardBody className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Delivery</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, deliveryMode: 'instant' })}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition',
                  form.deliveryMode === 'instant'
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                <Send size={16} /> Send instantly
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, deliveryMode: 'schedule' })}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition',
                  form.deliveryMode === 'schedule'
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                <CalendarClock size={16} /> Schedule
              </button>
            </div>
          </div>

          {form.deliveryMode === 'schedule' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
              <Input
                label="Date & time"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                required
              />

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Repeat</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, recurrenceMode: 'once', recurrenceDays: [] })}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm transition',
                      form.recurrenceMode === 'once'
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-600',
                    )}
                  >
                    Once (specific date)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, recurrenceMode: 'weekly' })}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm transition',
                      form.recurrenceMode === 'weekly'
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-600',
                    )}
                  >
                    Recurring weekly
                  </button>
                </div>
              </div>

              {form.recurrenceMode === 'weekly' && (
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">On these days</p>
                  <div className="flex flex-wrap gap-2">
                    {SMS_WEEKDAYS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleRecurrenceDay(day.value)}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-sm transition',
                          form.recurrenceDays.includes(day.value)
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  {form.recurrenceDays.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">Select at least one day</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center justify-between text-sm font-medium text-slate-700">
                Sender ID
                <Link href="/communication?tab=sender-ids" className="text-xs font-normal text-brand-600">
                  Manage Sender IDs
                </Link>
              </label>
              <select
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={form.senderId}
                onChange={(e) => setForm({ ...form, senderId: e.target.value })}
              >
                <option value={DEFAULT_SENDER_ID}>{DEFAULT_SENDER_ID} (Default)</option>
                {approvedSenders.map((s: { id: string; senderId: string }) => (
                  <option key={s.id} value={s.senderId}>{s.senderId}</option>
                ))}
              </select>
            </div>
            <MultiSelect
              label={
                <span className="flex w-full items-center justify-between">
                  Phone Group
                  <Link href="/communication?tab=phone-groups" className="text-xs font-normal text-brand-600">
                    Manage Groups
                  </Link>
                </span>
              }
              options={phoneGroupOptions}
              value={form.phoneGroupIds}
              onChange={(phoneGroupIds) => setForm({ ...form, phoneGroupIds })}
              placeholder="Select phone groups…"
              searchPlaceholder="Search groups…"
              emptyMessage="No phone groups yet"
            />
          </div>

          <Textarea
            label="Phone Numbers"
            value={form.phoneNumbers}
            onChange={(e) => setForm({ ...form, phoneNumbers: e.target.value })}
            rows={3}
            placeholder="Enter numbers separated by comma e.g. 08012345678, 08098765432"
          />

          <div>
            <Textarea
              label="Message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
              placeholder="Compose your message..."
              required
            />
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-slate-500">1 page = 160 characters</span>
              <span className="font-medium text-rose-600">
                {form.message.length} chars | {pages} page(s)
              </span>
            </div>
          </div>

          {hasPermission('comms.bulksms.send') && (
            <Button
              onClick={() => previewMutation.mutate()}
              loading={previewMutation.isPending}
              disabled={!form.message.trim() || !scheduleValid}
            >
              <Eye size={16} /> Preview Message
            </Button>
          )}
        </CardBody>
      </Card>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Review SMS" size="xl">
        {preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <ColorStatCard label="Recipients" value={preview.persons} icon={<MessageSquare size={20} />} color="blue" />
              <ColorStatCard label="Pages" value={preview.pages} icon={<MessageSquare size={20} />} color="emerald" />
              <ColorStatCard label="Total Cost" value={formatCurrency(preview.retailPrice)} icon={<Wallet size={20} />} color="amber" />
              <ColorStatCard
                label="Wallet Balance"
                value={formatCurrency(preview.walletBalance)}
                icon={<Wallet size={20} />}
                color={preview.hasEnoughBalance ? 'emerald' : 'rose'}
              />
            </div>

            {form.deliveryMode === 'schedule' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                <p className="font-medium">
                  {form.recurrenceMode === 'weekly'
                    ? `Recurring every ${form.recurrenceDays
                        .sort((a, b) => a - b)
                        .map((d) => SMS_WEEKDAYS.find((w) => w.value === d)?.short)
                        .join(', ')}`
                    : 'One-time schedule'}
                </p>
                <p className="mt-1 text-blue-800">
                  First run: {new Date(form.scheduledAt).toLocaleString('en-NG')}
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  Your wallet must cover the estimated cost per run. If a send fails, the charge is refunded automatically.
                </p>
              </div>
            )}

            {Object.keys(preview.networkSummary).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.networkSummary).map(([network, count]) => (
                  <Badge key={network} tone="gray">{network}: {count}</Badge>
                ))}
              </div>
            )}

            {!preview.hasEnoughBalance && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Insufficient balance. You need an additional {formatCurrency(preview.shortfall)} to{' '}
                {form.deliveryMode === 'instant' ? 'send' : 'schedule'} this message.
              </div>
            )}

            <Input label="Sender ID" value={preview.senderId} readOnly disabled className="bg-slate-50" />
            <Textarea label="Phone Numbers" value={preview.phoneNumbers} readOnly disabled rows={3} className="bg-slate-50" />
            <Textarea label="Message" value={preview.message} readOnly disabled rows={4} className="bg-slate-50" />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreview(null)}>Back</Button>
              {preview.hasEnoughBalance ? (
                form.deliveryMode === 'instant' ? (
                  <Button loading={sendMutation.isPending} onClick={() => sendMutation.mutate(preview)}>
                    Send Message
                  </Button>
                ) : (
                  <Button loading={scheduleMutation.isPending} onClick={() => scheduleMutation.mutate(preview)}>
                    <CalendarClock size={16} /> Schedule Message
                  </Button>
                )
              ) : (
                <Link href="/communication?tab=wallet">
                  <Button variant="outline">Top Up Wallet</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
