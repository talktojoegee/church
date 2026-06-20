'use client';

import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DetailGrid, formatMetadataValue } from '@/components/ui/DetailGrid';
import { formatDate } from '@/lib/utils';

export interface AuditRecord {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
}

function humanizeAction(action: string) {
  return action
    .split('.')
    .map((p) => p.replace(/_/g, ' '))
    .join(' · ');
}

function humanizeKey(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (s) => s.toUpperCase());
}

export function AuditDetailModal({
  record,
  onClose,
  actionTone,
}: {
  record: AuditRecord | null;
  onClose: () => void;
  actionTone: (action: string) => 'green' | 'red' | 'blue' | 'amber' | 'brand' | 'gray';
}) {
  if (!record) return null;

  const metadataItems =
    record.metadata && typeof record.metadata === 'object'
      ? Object.entries(record.metadata).map(([key, value]) => ({
          label: humanizeKey(key),
          value: formatMetadataValue(value),
          fullWidth: typeof value === 'object' && value !== null,
        }))
      : [];

  const financeLink =
    record.entityType === 'contribution' && record.entityId
      ? '/finance?tab=contributions'
      : record.entityType === 'expense' && record.entityId
        ? '/finance?tab=expenses'
        : null;

  return (
    <Modal open={!!record} onClose={onClose} title="Audit event details" size="lg">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={actionTone(record.action)}>{humanizeAction(record.action)}</Badge>
        <span className="text-sm text-slate-500">{formatDate(record.createdAt, true)}</span>
      </div>

      <DetailGrid
        items={[
          {
            label: 'Performed by',
            value: record.user ? (
              <div>
                <Link href={`/users`} className="text-brand-700 hover:underline">
                  {record.user.firstName} {record.user.lastName}
                </Link>
                <p className="text-xs font-normal text-slate-400">{record.user.email}</p>
              </div>
            ) : (
              'System'
            ),
            fullWidth: true,
          },
          { label: 'Action code', value: <code className="text-xs">{record.action}</code> },
          { label: 'IP address', value: record.ipAddress },
          { label: 'Entity type', value: record.entityType ? humanizeKey(record.entityType) : undefined },
          { label: 'Entity ID', value: record.entityId ? <code className="break-all text-xs">{record.entityId}</code> : undefined, fullWidth: !!record.entityId },
        ]}
      />

      {metadataItems.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-slate-700">Event data</p>
          <DetailGrid items={metadataItems} />
        </div>
      )}

      {financeLink && (
        <p className="mt-4 text-sm text-slate-500">
          Open{' '}
          <Link href={financeLink} className="font-medium text-brand-700 hover:underline" onClick={onClose}>
            Finance → {record.entityType === 'contribution' ? 'Income' : 'Expenses'}
          </Link>{' '}
          to browse related records.
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
