'use client';

import { Pencil, PiggyBank, Trash2, Upload } from 'lucide-react';
import { cn, formatCurrency, responsiveFigureClass } from '@/lib/utils';
import type { FundOption } from '@/lib/hooks';
import { humanize } from '@/lib/constants';

const GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-700',
] as const;

export function FundCard({
  fund,
  index,
  canUpdate,
  canDelete,
  hasRecords,
  canImport,
  onEdit,
  onDelete,
  onImport,
}: {
  fund: FundOption;
  index: number;
  canUpdate: boolean;
  canDelete: boolean;
  hasRecords: boolean;
  canImport?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onImport?: () => void;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const currency = fund.currency ?? 'NGN';
  const balanceText = formatCurrency(fund.balance, currency);
  const subtitle = [fund.bankName, fund.accountNumber].filter(Boolean).join(' · ');

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg',
        gradient,
      )}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
            <PiggyBank size={20} />
          </div>
          <div className="flex gap-1">
            {canImport && onImport && (
              <button
                type="button"
                onClick={onImport}
                title="Import statement"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white"
              >
                <Upload size={15} />
              </button>
            )}
            {canUpdate && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white"
              >
                <Pencil size={15} />
              </button>
            )}
            {canDelete && !hasRecords && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <h3 className="truncate font-semibold">{fund.name}</h3>
          {fund.isDefault && (
            <span className="shrink-0 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Default
            </span>
          )}
        </div>
        <p className="text-xs text-white/70">
          {fund.code && `${fund.code} · `}
          {humanize(fund.accountType)} · {currency}
        </p>
        {subtitle && <p className="truncate text-xs text-white/60">{subtitle}</p>}
        <p
          className={cn(
            'mt-2 font-bold tabular-nums leading-tight',
            responsiveFigureClass(balanceText, 'stat'),
          )}
        >
          {balanceText}
        </p>
        <div className="mt-3 flex justify-between gap-2 text-xs text-white/75">
          <span className="truncate">
            {fund.dateFiltered ? 'In (period)' : 'In'}: {formatCurrency(fund.totalIn, currency)}
          </span>
          <span className="truncate">
            {fund.dateFiltered ? 'Out (period)' : 'Out'}: {formatCurrency(fund.totalOut, currency)}
          </span>
        </div>
      </div>
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/5" />
    </div>
  );
}
