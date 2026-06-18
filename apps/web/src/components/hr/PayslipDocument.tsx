import { assetUrl } from '@/lib/api';
import type { PublicBranding } from '@/lib/branding';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PayslipBreakdownLine, PayslipPrintData } from './payslip-types';

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function lineAmount(line: PayslipBreakdownLine, baseSalary: number) {
  return line.isPercentage ? (baseSalary * line.amount) / 100 : line.amount;
}

export function PayslipDocument({
  data,
  branding,
}: {
  data: PayslipPrintData;
  branding: PublicBranding;
}) {
  const { payslip, employee, payRun } = data;
  const currency = branding.currency ?? 'NGN';
  const breakdown = Array.isArray(payslip.breakdown) ? payslip.breakdown : [];
  const allowances = breakdown.filter((l) => l.type === 'ALLOWANCE');
  const deductions = breakdown.filter((l) => l.type === 'DEDUCTION');
  const logoSrc = branding.logoUrl ? assetUrl(branding.logoUrl) : null;
  const generatedAt = new Date().toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const detail = (label: string, value: string) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
        {label}
      </div>
      <div style={{ fontWeight: 600, color: '#0f172a' }}>{value}</div>
    </div>
  );

  const moneyRow = (label: string, amount: number, tone: 'default' | 'positive' | 'negative' = 'default') => {
    const color = tone === 'positive' ? '#047857' : tone === 'negative' ? '#be123c' : '#0f172a';
    const prefix = tone === 'positive' ? '+' : tone === 'negative' ? '−' : '';
    return (
      <tr>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{label}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600, color }}>
          {prefix}
          {formatCurrency(amount, currency)}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          gap: 20,
          alignItems: 'flex-start',
          paddingBottom: 18,
          borderBottom: '2px solid #152a7a',
          marginBottom: 22,
        }}
      >
        <div style={{ flexShrink: 0 }}>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={`${branding.name} logo`}
              style={{ height: 72, width: 'auto', maxWidth: 120, objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #152a7a, #c62828)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {branding.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#152a7a', marginBottom: 6 }}>{branding.name}</h1>
          {branding.tagline ? (
            <p style={{ color: '#475569', marginBottom: 8, fontSize: 12 }}>{branding.tagline}</p>
          ) : null}
          <div style={{ color: '#334155', fontSize: 12, lineHeight: 1.6 }}>
            {branding.address ? <div>{branding.address}</div> : null}
            {branding.phone ? <div>Phone: {branding.phone}</div> : null}
            {branding.email ? <div>Email: {branding.email}</div> : null}
          </div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 150 }}>
          <div
            style={{
              display: 'inline-block',
              background: '#152a7a',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.03em',
            }}
          >
            PAYSLIP
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#475569' }}>
            <div>
              <strong>Period:</strong> {payRun.period}
            </div>
            <div>
              <strong>Run:</strong> {payRun.title}
            </div>
            {payRun.status ? (
              <div>
                <strong>Status:</strong> {humanize(payRun.status)}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 22,
          padding: 16,
          background: '#f8fafc',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        }}
      >
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#152a7a', marginBottom: 12 }}>Employee details</h2>
          {detail('Name', `${employee.firstName} ${employee.lastName}`)}
          {detail('Employee no.', employee.employeeNumber)}
          {detail('Position', employee.position ?? '—')}
          {detail('Department', employee.department ?? '—')}
        </div>
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#152a7a', marginBottom: 12 }}>Contact & bank</h2>
          {detail('Email', employee.email ?? '—')}
          {detail('Phone', employee.phone ?? '—')}
          {detail('Branch', employee.branch?.name ?? '—')}
          {detail(
            'Bank account',
            employee.bankName
              ? `${employee.bankName}${employee.bankAccountNo ? ` · ${employee.bankAccountNo}` : ''}${employee.bankAccountName ? ` (${employee.bankAccountName})` : ''}`
              : '—',
          )}
          {detail('Employment', humanize(employee.employmentType ?? '—'))}
          {detail('Hire date', formatDate(employee.hireDate))}
        </div>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#152a7a', marginBottom: 10 }}>Earnings</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: '#475569' }}>Description</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, color: '#475569' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {moneyRow('Base salary', payslip.baseSalary)}
            {allowances.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ padding: '10px 12px', color: '#64748b', fontStyle: 'italic' }}>
                  No additional allowances
                </td>
              </tr>
            ) : (
              allowances.map((line, idx) =>
                moneyRow(
                  `${line.name}${line.isPercentage ? ` (${line.amount}%)` : ''}${line.source === 'period' ? ' · Period adjustment' : ''}`,
                  lineAmount(line, payslip.baseSalary),
                  'positive',
                ),
              )
            )}
            <tr style={{ background: '#ecfdf5' }}>
              <td style={{ padding: '10px 12px', fontWeight: 700 }}>Gross pay</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#047857' }}>
                {formatCurrency(payslip.grossPay, currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#152a7a', marginBottom: 10 }}>Deductions</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: '#475569' }}>Description</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, color: '#475569' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {deductions.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ padding: '10px 12px', color: '#64748b', fontStyle: 'italic' }}>
                  No deductions
                </td>
              </tr>
            ) : (
              deductions.map((line) =>
                moneyRow(
                  `${line.name}${line.isPercentage ? ` (${line.amount}%)` : ''}${line.source === 'period' ? ' · Period adjustment' : ''}`,
                  lineAmount(line, payslip.baseSalary),
                  'negative',
                ),
              )
            )}
            <tr style={{ background: '#fff1f2' }}>
              <td style={{ padding: '10px 12px', fontWeight: 700 }}>Total deductions</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#be123c' }}>
                {formatCurrency(payslip.totalDeductions, currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 28,
        }}
      >
        <div
          style={{
            minWidth: 280,
            padding: '16px 18px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #152a7a, #1e2f6e)',
            color: '#fff',
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 4 }}>Net pay</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {formatCurrency(payslip.netPay, currency)}
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, color: '#64748b', fontSize: 11 }}>
        <p>
          This payslip was generated electronically by {branding.name}. Amounts reflect payroll records for{' '}
          {payRun.period}.
        </p>
        <p style={{ marginTop: 6 }}>Generated on {generatedAt}</p>
      </footer>
    </div>
  );
}
