import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PayslipDocument } from '@/components/hr/PayslipDocument';
import type { PayslipPrintData } from '@/components/hr/payslip-types';
import type { PublicBranding } from './branding';
import { printHtml } from './print-html';

export function printPayslip(data: PayslipPrintData, branding: PublicBranding) {
  const body = renderToStaticMarkup(createElement(PayslipDocument, { data, branding }));
  const title = `Payslip — ${data.employee.firstName} ${data.employee.lastName} (${data.payRun.period})`;
  printHtml(body, title);
}
