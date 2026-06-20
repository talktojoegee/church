export type StatementFormat = 'zenith' | 'generic';

export interface ParsedStatementRow {
  rowNumber: number;
  date: string;
  effectiveDate?: string;
  description: string;
  debit: number | null;
  credit: number | null;
  amount: number;
  kind: 'income' | 'expense';
  transactionRef: string;
}

export interface ParsedStatementAccountMeta {
  accountName?: string;
  accountNumber?: string;
  beginBalance?: number;
  beginBalanceDate?: string;
  currency?: string;
}

export interface ParsedStatement {
  format: StatementFormat;
  accountMeta?: ParsedStatementAccountMeta;
  rows: ParsedStatementRow[];
}

function cellText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text: string }).text).trim();
  }
  if (value instanceof Date) {
    const d = value;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  return String(value).trim();
}

export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[A-Za-z₦$€£,\s]/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseStatementDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (slash) {
    const [, dd, mm, yyyy] = slash;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return iso[0];

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/\s+/g, ' ').trim();
}

function rowKind(debit: number | null, credit: number | null): 'income' | 'expense' | null {
  if (credit != null && credit > 0 && (!debit || debit === 0)) return 'income';
  if (debit != null && debit > 0 && (!credit || credit === 0)) return 'expense';
  return null;
}

function buildRow(
  rowNumber: number,
  dateRaw: string,
  description: string,
  debitRaw: string,
  creditRaw: string,
  refRaw: string,
  effectiveDateRaw?: string,
  explicitKind?: string,
): ParsedStatementRow | null {
  const debit = parseAmount(debitRaw);
  const credit = parseAmount(creditRaw);
  const kind =
    explicitKind?.toLowerCase() === 'income'
      ? 'income'
      : explicitKind?.toLowerCase() === 'expense'
        ? 'expense'
        : rowKind(debit, credit);
  if (!kind) return null;

  const amount = kind === 'income' ? (credit ?? 0) : (debit ?? 0);
  if (amount <= 0) return null;

  const date = parseStatementDate(dateRaw);
  if (!date) return null;

  const effectiveDate = effectiveDateRaw ? parseStatementDate(effectiveDateRaw) ?? undefined : undefined;

  return {
    rowNumber,
    date,
    effectiveDate,
    description: description.trim(),
    debit,
    credit,
    amount,
    kind,
    transactionRef: refRaw.trim(),
  };
}

type SheetLike = {
  name: string;
  rowCount: number;
  getRow(n: number): { eachCell: (opts: { includeEmpty: boolean }, fn: (cell: { value: unknown }, col: number) => void) => void };
};

function readRow(sheet: SheetLike, rowNum: number): string[] {
  const vals: string[] = [];
  sheet.getRow(rowNum).eachCell({ includeEmpty: true }, (cell, col) => {
    vals[col] = cellText(cell.value);
  });
  return vals;
}

function findHeaderRow(sheet: SheetLike): { rowNum: number; headers: string[] } | null {
  for (let r = 1; r <= Math.min(sheet.rowCount, 20); r++) {
    const headers = readRow(sheet, r).map(normalizeHeader);
    const hasDebit = headers.some((h) => h.includes('debit'));
    const hasCredit = headers.some((h) => h.includes('credit'));
    if (hasDebit && hasCredit) return { rowNum: r, headers };
  }
  return null;
}

function colIndex(headers: string[], ...needles: string[]): number {
  for (let i = 1; i < headers.length; i++) {
    const h = headers[i] ?? '';
    if (needles.every((n) => h.includes(n))) return i;
  }
  for (const n of needles) {
    const idx = headers.findIndex((h) => (h ?? '').includes(n));
    if (idx > 0) return idx;
  }
  return -1;
}

function parseZenithMeta(sheet: SheetLike): ParsedStatementAccountMeta | undefined {
  const row1 = readRow(sheet, 1).map((c) => c.trim());
  const row2 = readRow(sheet, 2);
  if (!row1[1]?.toLowerCase().includes('account')) return undefined;

  const balanceRaw = row2[4] ?? row2[3] ?? '';
  const currencyMatch = balanceRaw.match(/^([A-Z]{3})/);
  return {
    accountName: row2[1]?.trim(),
    accountNumber: row2[2]?.trim(),
    beginBalanceDate: parseStatementDate(row2[3] ?? '') ?? undefined,
    beginBalance: parseAmount(balanceRaw) ?? undefined,
    currency: currencyMatch?.[1],
  };
}

function parseSheet(sheet: SheetLike): ParsedStatement {
  const zenithMeta = parseZenithMeta(sheet);
  const header = findHeaderRow(sheet);
  if (!header) {
    return { format: 'generic', rows: [] };
  }

  const { rowNum, headers } = header;
  const dateCol = colIndex(headers, 'create date') > 0 ? colIndex(headers, 'create date') : colIndex(headers, 'date');
  const effCol = colIndex(headers, 'effective date');
  const descCol = colIndex(headers, 'description');
  const debitCol = colIndex(headers, 'debit');
  const creditCol = colIndex(headers, 'credit');
  const refCol = colIndex(headers, 'transaction ref') > 0 ? colIndex(headers, 'transaction ref') : colIndex(headers, 'reference');
  const typeCol = colIndex(headers, 'type');

  const rows: ParsedStatementRow[] = [];
  for (let r = rowNum + 1; r <= sheet.rowCount; r++) {
    const cells = readRow(sheet, r);
    const first = (cells[1] ?? '').trim();
    if (!first || first.toUpperCase() === 'CLEARED ITEMS') continue;

    const parsed = buildRow(
      r,
      cells[dateCol] ?? '',
      cells[descCol] ?? '',
      cells[debitCol] ?? '',
      cells[creditCol] ?? '',
      cells[refCol] ?? '',
      effCol > 0 ? cells[effCol] : undefined,
      typeCol > 0 ? cells[typeCol] : undefined,
    );
    if (parsed) rows.push(parsed);
  }

  return {
    format: zenithMeta ? 'zenith' : 'generic',
    accountMeta: zenithMeta,
    rows,
  };
}

export async function parseStatementBuffer(buffer: Buffer): Promise<ParsedStatement> {
  const mod = await import('exceljs');
  const ExcelJS = mod.default ?? mod;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheet =
    wb.getWorksheet('Activity_Statement') ??
    wb.worksheets.find((ws) => {
      for (let r = 1; r <= Math.min(ws.rowCount, 10); r++) {
        const row = readRow(ws as SheetLike, r).join(' ').toLowerCase();
        if (row.includes('debit') && row.includes('credit')) return true;
      }
      return false;
    }) ??
    wb.worksheets[0];

  if (!sheet) return { format: 'generic', rows: [] };
  return parseSheet(sheet as SheetLike);
}

export function suggestGivingTypeName(description: string): string {
  const d = description.toLowerCase();
  if (d.includes('tithe')) return 'Tithe';
  if (d.includes('offering')) return 'Offering';
  if (d.includes('building')) return 'Building';
  if (d.includes('mission')) return 'Missions';
  if (d.includes('welfare')) return 'Welfare';
  if (d.includes('thanksgiving')) return 'Thanksgiving';
  return 'Donation';
}

export function suggestExpenseCategoryName(description: string): string {
  const d = description.toLowerCase();
  if (
    d.includes('bank charge') ||
    d.includes('stamp duty') ||
    d.includes('sms charge') ||
    d.includes('account maintenance') ||
    d.includes('vat on')
  ) {
    return 'Maintenance';
  }
  if (d.includes('salary') || d.includes('payroll') || d.includes('staff')) return 'Salaries';
  if (d.includes('utility') || d.includes('phcn') || d.includes('ikedc')) return 'Utilities';
  if (d.includes('construction') || d.includes('building material')) return 'Construction';
  return 'Office Supplies';
}
