export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export async function buildExcelBuffer(
  sheetName: string,
  columns: ExcelColumn[],
  rows: Record<string, string | number | null | undefined>[],
): Promise<Buffer> {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16 }));
  ws.getRow(1).font = { bold: true };
  for (const row of rows) {
    ws.addRow(row);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildExcelWithSummary(
  detailSheetName: string,
  summarySheetName: string,
  detailColumns: ExcelColumn[],
  detailRows: Record<string, string | number | null | undefined>[],
  summaryColumns: ExcelColumn[],
  summaryRows: Record<string, string | number | null | undefined>[],
): Promise<Buffer> {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();

  const summary = wb.addWorksheet(summarySheetName);
  summary.columns = summaryColumns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
  summary.getRow(1).font = { bold: true };
  for (const row of summaryRows) summary.addRow(row);

  const detail = wb.addWorksheet(detailSheetName);
  detail.columns = detailColumns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16 }));
  detail.getRow(1).font = { bold: true };
  for (const row of detailRows) detail.addRow(row);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
