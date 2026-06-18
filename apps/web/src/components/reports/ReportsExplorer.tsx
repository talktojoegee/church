'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Filter } from 'lucide-react';
import { api, downloadExport } from '@/lib/api';
import { useBranches } from '@/lib/hooks';
import { Card, CardBody, CardHeader, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import {
  REPORT_GROUPS,
  REPORT_TYPES,
  SUMMARY_LABELS,
  formatSummaryValue,
  getReportConfig,
  type ReportType,
} from '@/lib/report-types';

const SUMMARY_COLORS = ['blue', 'emerald', 'violet', 'amber', 'rose', 'indigo'] as const;

function defaultFromDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

function defaultToDate() {
  return new Date().toISOString().slice(0, 10);
}

export function ReportsExplorer() {
  const branches = useBranches();
  const [reportType, setReportType] = useState<ReportType>('members');
  const [branchId, setBranchId] = useState('');
  const [from, setFrom] = useState(defaultFromDate());
  const [to, setTo] = useState(defaultToDate());
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const config = getReportConfig(reportType);

  const params = useMemo(
    () => ({
      type: reportType,
      ...(branchId ? { branchId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(status ? { status } : {}),
      page,
      pageSize: 50,
    }),
    [reportType, branchId, from, to, status, page],
  );

  const reportQuery = useQuery({
    queryKey: ['report-data', params],
    queryFn: async () => (await api.get('/reports/data', { params })).data,
  });

  const data = reportQuery.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const handleExport = async () => {
    setExporting(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      await downloadExport('/reports/export', `${reportType}-report-${date}.xlsx`, {
        type: reportType,
        branchId: branchId || undefined,
        from: from || undefined,
        to: to || undefined,
        status: status || undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  const summaryEntries = Object.entries(data?.summary ?? {});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Report filters"
          description="Select a report, apply filters, preview data, then export to Excel"
          action={
            <Button loading={exporting} onClick={handleExport} disabled={!data?.rows?.length && !data?.total}>
              <Download size={16} /> Export Excel
            </Button>
          }
        />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Report type"
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value as ReportType);
                setStatus('');
                setPage(1);
              }}
            >
              {REPORT_GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {REPORT_TYPES.filter((r) => r.group === group).map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </optgroup>
              ))}
            </Select>

            {(branches.data?.length ?? 0) > 1 && (
              <Select
                label="Branch"
                value={branchId}
                onChange={(e) => { setBranchId(e.target.value); setPage(1); }}
              >
                <option value="">All branches</option>
                {branches.data?.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            )}

            {config.statusOptions && (
              <Select
                label="Status"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              >
                <option value="">All statuses</option>
                {config.statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            )}

            <Input
              label={config.dateLabel ? `${config.dateLabel} from` : 'From date'}
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            />
            <Input
              label={config.dateLabel ? `${config.dateLabel} to` : 'To date'}
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFrom(defaultFromDate());
                setTo(defaultToDate());
                setStatus('');
                setBranchId('');
                setPage(1);
              }}
            >
              <Filter size={14} /> Reset filters
            </Button>
          </div>
        </CardBody>
      </Card>

      {summaryEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summaryEntries.map(([key, value], i) => (
            <ColorStatCard
              key={key}
              label={SUMMARY_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              value={formatSummaryValue(key, value as number | string)}
              icon={<FileSpreadsheet size={18} />}
              color={SUMMARY_COLORS[i % SUMMARY_COLORS.length]}
              dense
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader
          title={data?.title ?? config.label}
          description={
            data
              ? `${data.total} record(s) · showing page ${data.page} of ${totalPages}`
              : 'Loading…'
          }
        />
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <SerialTh />
                {(data?.columns ?? []).map((col: { key: string; label: string }) => (
                  <Th key={col.key}>{col.label}</Th>
                ))}
                {reportQuery.isLoading && !data?.columns?.length && <Th>Loading…</Th>}
              </tr>
            </thead>
            <tbody>
              {reportQuery.isLoading && (
                <EmptyRow colSpan={(data?.columns?.length ?? 0) + 1} message="Loading report…" />
              )}
              {!reportQuery.isLoading && !data?.rows?.length && (
                <EmptyRow colSpan={(data?.columns?.length ?? 0) + 1} message="No records match your filters." />
              )}
              {data?.rows?.map((row: Record<string, string | number | null>, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <SerialTd index={i + (page - 1) * 50} />
                  {data.columns.map((col: { key: string; label: string }) => (
                    <Td key={col.key} className={col.key === 'message' ? 'max-w-xs truncate' : undefined}>
                      {row[col.key] ?? '—'}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
