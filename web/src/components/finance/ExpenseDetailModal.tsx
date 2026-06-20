'use client';

import { Download } from 'lucide-react';
import { downloadExport } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DetailGrid } from '@/components/ui/DetailGrid';
import { humanize } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface ExpenseRecord {
  id: string;
  expenseDate: string;
  amount: number | string;
  paymentMethod: string;
  paidTo?: string | null;
  reference?: string | null;
  description?: string | null;
  category?: { name: string } | null;
  fund?: { name: string; currency?: string; bankName?: string | null; accountNumber?: string | null } | null;
  branch?: { name: string } | null;
  payslipId?: string | null;
  payslip?: {
    payRun?: { title: string; period?: string | null };
    employee?: { firstName: string; lastName: string; employeeNumber?: string };
  } | null;
}

export function ExpenseDetailModal({
  record,
  onClose,
  canDownload,
}: {
  record: ExpenseRecord | null;
  onClose: () => void;
  canDownload?: boolean;
}) {
  if (!record) return null;

  return (
    <Modal open={!!record} onClose={onClose} title="Expense details" size="lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-bold text-rose-600">{formatCurrency(Number(record.amount))}</p>
          <p className="text-sm text-slate-500">{formatDate(record.expenseDate)}</p>
        </div>
        {canDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadExport(`/finance/expenses/${record.id}/voucher`, `expense-voucher-${record.id}.pdf`)
            }
          >
            <Download size={16} /> Download voucher
          </Button>
        )}
      </div>

      <DetailGrid
        items={[
          { label: 'Category', value: record.category?.name ? <Badge tone="red">{record.category.name}</Badge> : undefined },
          { label: 'Paid to', value: record.paidTo },
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
          { label: 'Reference', value: record.reference },
          { label: 'Description', value: record.description, fullWidth: true },
          ...(record.payslip?.employee
            ? [
                {
                  label: 'Payroll',
                  value: `${record.payslip.employee.firstName} ${record.payslip.employee.lastName}${
                    record.payslip.employee.employeeNumber ? ` (${record.payslip.employee.employeeNumber})` : ''
                  }`,
                },
                {
                  label: 'Pay run',
                  value: record.payslip.payRun?.title
                    ? `${record.payslip.payRun.title}${record.payslip.payRun.period ? ` · ${record.payslip.payRun.period}` : ''}`
                    : undefined,
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
