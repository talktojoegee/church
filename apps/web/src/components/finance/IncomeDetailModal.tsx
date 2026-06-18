'use client';

import { Download } from 'lucide-react';
import { downloadExport } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DetailGrid } from '@/components/ui/DetailGrid';
import { humanize } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface IncomeRecord {
  id: string;
  receiptNumber?: string | null;
  contributedAt: string;
  amount: number | string;
  paymentMethod: string;
  reference?: string | null;
  note?: string | null;
  member?: { firstName: string; lastName: string } | null;
  givingType?: { name: string } | null;
  fund?: { name: string; currency?: string; bankName?: string | null; accountNumber?: string | null } | null;
  branch?: { name: string } | null;
  pledge?: { campaign: string } | null;
  pledgeId?: string | null;
  payslipId?: string | null;
  payslip?: {
    payRun?: { title: string; period?: string | null };
    employee?: { firstName: string; lastName: string };
  } | null;
}

export function IncomeDetailModal({
  record,
  onClose,
  canDownload,
}: {
  record: IncomeRecord | null;
  onClose: () => void;
  canDownload?: boolean;
}) {
  if (!record) return null;

  const source = record.payslipId
    ? 'Payroll repayment'
    : record.pledgeId
      ? `Pledge${record.pledge?.campaign ? `: ${record.pledge.campaign}` : ''}`
      : 'Manual entry';

  return (
    <Modal open={!!record} onClose={onClose} title="Income details" size="lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(Number(record.amount))}</p>
          <p className="text-sm text-slate-500">{formatDate(record.contributedAt)}</p>
        </div>
        {canDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadExport(
                `/finance/contributions/${record.id}/receipt`,
                `receipt-${record.receiptNumber ?? record.id}.pdf`,
              )
            }
          >
            <Download size={16} /> Download receipt
          </Button>
        )}
      </div>

      <DetailGrid
        items={[
          { label: 'Receipt number', value: record.receiptNumber ?? '—' },
          { label: 'Income type', value: record.givingType?.name },
          { label: 'Member', value: record.member ? `${record.member.firstName} ${record.member.lastName}` : 'Anonymous' },
          { label: 'Payment method', value: humanize(record.paymentMethod) },
          { label: 'Account', value: record.fund?.name },
          {
            label: 'Bank account',
            value:
              record.fund?.bankName && record.fund?.accountNumber
                ? `${record.fund.bankName} · ${record.fund.accountNumber}`
                : undefined,
          },
          { label: 'Branch', value: record.branch?.name },
          { label: 'Source', value: <Badge tone="blue">{source}</Badge> },
          { label: 'Reference', value: record.reference },
          { label: 'Note', value: record.note, fullWidth: true },
          ...(record.payslip?.employee
            ? [
                {
                  label: 'Payroll',
                  value: record.payslip.payRun?.title
                    ? `${record.payslip.payRun.title}${record.payslip.payRun.period ? ` (${record.payslip.payRun.period})` : ''}`
                    : `${record.payslip.employee.firstName} ${record.payslip.employee.lastName}`,
                  fullWidth: true,
                },
              ]
            : []),
        ]}
      />

      <div className="mt-5 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
