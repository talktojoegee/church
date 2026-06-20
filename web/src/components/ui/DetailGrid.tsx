'use client';

import type { ReactNode } from 'react';

export function DetailGrid({
  items,
}: {
  items: { label: string; value?: ReactNode; fullWidth?: boolean }[];
}) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map(({ label, value, fullWidth }) => (
        <div
          key={label}
          className={`rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50 ${
            fullWidth ? 'sm:col-span-2' : ''
          }`}
        >
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function formatMetadataValue(value: unknown): ReactNode {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return JSON.stringify(value, null, 2);
}
