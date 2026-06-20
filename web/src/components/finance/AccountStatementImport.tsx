'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import { api, downloadExport } from '@/lib/api';
import { toast } from '@/lib/toast-context';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDefaultBranchId, useExpenseCategories, useFunds, useGivingTypes, useDefaultFundId } from '@/lib/hooks';

interface PreviewRow {
  rowNumber: number;
  date: string;
  description: string;
  kind: 'income' | 'expense';
  amount: number;
  transactionRef: string;
  duplicate: boolean;
  givingTypeId?: string;
  categoryId?: string;
  suggestedGivingTypeName?: string;
  suggestedCategoryName?: string;
  skip?: boolean;
}

interface PreviewResult {
  format: string;
  accountMeta?: {
    accountName?: string;
    accountNumber?: string;
    beginBalance?: number;
    beginBalanceDate?: string;
    currency?: string;
  };
  fund?: { id: string; name: string; currency: string };
  rows: PreviewRow[];
  stats: {
    total: number;
    duplicates: number;
    income: number;
    expense: number;
    incomeAmount: number;
    expenseAmount: number;
  };
  error?: string;
}

export function AccountStatementImport({
  defaultFundId: initialFundId,
  onDone,
}: {
  defaultFundId?: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const branchId = useDefaultBranchId();
  const funds = useFunds(branchId);
  const branchDefaultFundId = useDefaultFundId(branchId);
  const givingTypes = useGivingTypes(branchId);
  const categories = useExpenseCategories(branchId);
  const inputRef = useRef<HTMLInputElement>(null);

  const [fundId, setFundId] = useState(initialFundId ?? branchDefaultFundId ?? '');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [commitResult, setCommitResult] = useState<{
    incomeCreated: number;
    expenseCreated: number;
    skipped: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const selectedFund = funds.data?.find((f) => f.id === fundId);
  const currency = selectedFund?.currency ?? 'NGN';

  const previewMut = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      form.append('fundId', fundId);
      form.append('branchId', branchId);
      return (await api.post('/finance/import/preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data as PreviewResult;
    },
    meta: { skipSuccessToast: true, errorMessage: 'Failed to parse statement' },
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setPreview(data);
      setRows(data.rows.map((r) => ({ ...r, skip: r.duplicate })));
      toast.success(`Parsed ${data.stats.total} transaction(s)`);
    },
  });

  const commitMut = useMutation({
    mutationFn: async () =>
      (
        await api.post('/finance/import/commit', {
          fundId,
          branchId,
          rows: rows.map((r) => ({
            rowNumber: r.rowNumber,
            date: r.date,
            description: r.description,
            kind: r.kind,
            amount: r.amount,
            transactionRef: r.transactionRef,
            givingTypeId: r.givingTypeId,
            categoryId: r.categoryId,
            skip: r.skip || r.duplicate,
          })),
        })
      ).data,
    meta: { skipSuccessToast: true, errorMessage: 'Import failed' },
    onSuccess: (data) => {
      setCommitResult(data);
      toast.success(`Imported ${data.incomeCreated} income and ${data.expenseCreated} expense record(s)`);
      qc.invalidateQueries({ queryKey: ['funds'] });
      qc.invalidateQueries({ queryKey: ['funds-stats'] });
      qc.invalidateQueries({ queryKey: ['contributions'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const importableCount = rows.filter((r) => !r.skip && !r.duplicate).length;

  return (
    <div className="space-y-4">
      {!preview && !commitResult && (
        <>
          <Select
            label="Account"
            value={fundId}
            onChange={(e) => setFundId(e.target.value)}
            required
          >
            <option value="">Select account…</option>
            {funds.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {f.accountNumber ? ` (${f.accountNumber})` : ''} — {f.currency}
              </option>
            ))}
          </Select>

          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <FileSpreadsheet className="mx-auto mb-3 text-slate-400" size={36} />
            <p className="text-sm text-slate-600">
              Upload a bank statement (.xlsx). Zenith Bank exports work as-is, or use the generic
              template.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Credits become income, debits become expenses. Transaction refs prevent duplicates.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadExport('/finance/import/template', 'finance-import-template.xlsx')}
              >
                <Download size={14} /> Download template
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (!fundId) {
                      toast.error('Select an account first');
                      return;
                    }
                    previewMut.mutate(f);
                  }
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                size="sm"
                loading={previewMut.isPending}
                disabled={!fundId}
                onClick={() => inputRef.current?.click()}
              >
                <Upload size={14} /> Choose Excel file
              </Button>
            </div>
          </div>
        </>
      )}

      {preview && !commitResult && (
        <>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">
              {preview.format === 'zenith' ? 'Zenith Bank statement' : 'Generic statement'} →{' '}
              {preview.fund?.name}
            </p>
            {preview.accountMeta?.accountNumber && (
              <p className="text-slate-600">
                Account {preview.accountMeta.accountNumber}
                {preview.accountMeta.beginBalance != null &&
                  ` · Opening ${formatCurrency(preview.accountMeta.beginBalance, currency)}`}
              </p>
            )}
            <p className="mt-1 text-slate-500">
              {preview.stats.total} rows · {preview.stats.duplicates} duplicate(s) ·{' '}
              {importableCount} to import ·{' '}
              {formatCurrency(preview.stats.incomeAmount, currency)} in /{' '}
              {formatCurrency(preview.stats.expenseAmount, currency)} out
            </p>
          </div>

          <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
            <Table>
              <thead>
                <tr>
                  <Th>Import</Th>
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Category</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <EmptyRow colSpan={6} message="No transactions found" />}
                {rows.map((r) => (
                  <tr key={r.rowNumber} className={r.duplicate ? 'bg-slate-50 opacity-60' : ''}>
                    <Td>
                      <input
                        type="checkbox"
                        checked={!r.skip && !r.duplicate}
                        disabled={r.duplicate}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.rowNumber === r.rowNumber ? { ...x, skip: !e.target.checked } : x,
                            ),
                          )
                        }
                      />
                    </Td>
                    <Td className="whitespace-nowrap">{formatDate(r.date)}</Td>
                    <Td className="max-w-[200px] truncate" title={r.description}>
                      {r.description}
                    </Td>
                    <Td>
                      <Badge tone={r.kind === 'income' ? 'green' : 'red'}>
                        {r.kind === 'income' ? 'Income' : 'Expense'}
                      </Badge>
                      {r.duplicate && (
                        <span className="ml-1 text-xs text-slate-400">duplicate</span>
                      )}
                    </Td>
                    <Td className="tabular-nums">{formatCurrency(r.amount, currency)}</Td>
                    <Td>
                      {r.kind === 'income' ? (
                        <select
                          className="w-full max-w-[140px] rounded border border-slate-200 px-1 py-0.5 text-xs"
                          value={r.givingTypeId ?? ''}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.rowNumber === r.rowNumber
                                  ? { ...x, givingTypeId: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        >
                          {givingTypes.data?.map((t: { id: string; name: string }) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          className="w-full max-w-[140px] rounded border border-slate-200 px-1 py-0.5 text-xs"
                          value={r.categoryId ?? ''}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.rowNumber === r.rowNumber
                                  ? { ...x, categoryId: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        >
                          {categories.data?.map((c: { id: string; name: string }) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}

      {commitResult && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p className="font-medium text-slate-900">
            Import complete: {commitResult.incomeCreated} income, {commitResult.expenseCreated}{' '}
            expenses, {commitResult.skipped} skipped
          </p>
          {commitResult.errors.length > 0 && (
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-rose-600">
              {commitResult.errors.map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        {preview && !commitResult && (
          <Button type="button" variant="outline" onClick={() => { setPreview(null); setRows([]); }}>
            Back
          </Button>
        )}
        {preview && !commitResult && (
          <Button
            type="button"
            loading={commitMut.isPending}
            disabled={importableCount === 0}
            onClick={() => commitMut.mutate()}
          >
            Import {importableCount} record(s)
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onDone}>
          {commitResult ? 'Close' : 'Cancel'}
        </Button>
      </div>
    </div>
  );
}
