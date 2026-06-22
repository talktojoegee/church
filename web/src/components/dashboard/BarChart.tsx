'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const LABEL_ROW = 28;
const LEGEND_ROW = 24;

export interface BarChartItem {
  label: string;
  value: number;
  sublabel?: string;
}

export function BarChart({
  data,
  color = 'brand',
  height = 280,
  formatValue,
}: {
  data: BarChartItem[];
  color?: 'brand' | 'emerald' | 'violet' | 'sky';
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const plotHeight = height - LABEL_ROW;

  const barClass = {
    brand: 'bg-gradient-to-t from-brand-600 to-flame-orange',
    emerald: 'bg-gradient-to-t from-emerald-600 to-emerald-400',
    violet: 'bg-gradient-to-t from-brand-800 to-brand-500',
    sky: 'bg-gradient-to-t from-brand-700 to-gold',
  }[color];

  return (
    <div style={{ height }}>
      <div className="relative flex items-end gap-1.5 sm:gap-2" style={{ height: plotHeight }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const active = hovered === i;
          return (
            <div
              key={`${d.label}-${i}`}
              className="group relative flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {active && (
                <div className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg">
                  {formatValue ? formatValue(d.value) : d.value}
                  {d.sublabel && <span className="ml-1 text-white/70">{d.sublabel}</span>}
                </div>
              )}
              <div
                className={cn(
                  'w-full rounded-t-md transition-all duration-200',
                  barClass,
                  active ? 'opacity-100 shadow-md' : 'opacity-80 group-hover:opacity-100',
                )}
                style={{ height: `${Math.max(pct, d.value > 0 ? 6 : 0)}%`, minHeight: d.value > 0 ? 6 : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2">
        {data.map((d, i) => (
          <span
            key={`${d.label}-label-${i}`}
            className={cn(
              'flex-1 truncate text-center text-[10px] sm:text-xs',
              hovered === i ? 'font-semibold text-slate-700' : 'text-slate-400',
            )}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GroupedBarChart({
  data,
  height = 300,
  formatValue,
}: {
  data: { label: string; income: number; expense: number }[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const [hovered, setHovered] = useState<{ i: number; key: 'income' | 'expense' } | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const plotHeight = height - LEGEND_ROW - LABEL_ROW - 8;

  return (
    <div style={{ height }}>
      <div className="mb-2 flex gap-4 text-xs" style={{ minHeight: LEGEND_ROW }}>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Expenses
        </span>
      </div>
      <div className="flex items-end gap-2" style={{ height: plotHeight }}>
        {data.map((d, i) => (
          <div
            key={`${d.label}-${i}`}
            className="flex h-full flex-1 flex-col justify-end"
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex h-full w-full items-end justify-center gap-0.5">
              {(['income', 'expense'] as const).map((key) => {
                const val = d[key];
                const pct = (val / max) * 100;
                const active = hovered?.i === i && hovered.key === key;
                return (
                  <div
                    key={`${i}-${key}`}
                    className="relative flex h-full flex-1 flex-col justify-end"
                    onMouseEnter={() => setHovered({ i, key })}
                  >
                    {active && (
                      <div className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-0.5 text-[10px] text-white">
                        {formatValue ? formatValue(val) : val}
                      </div>
                    )}
                    <div
                      className={cn(
                        'w-full rounded-t transition-all',
                        key === 'income'
                          ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                          : 'bg-gradient-to-t from-rose-500 to-rose-300',
                        active && 'shadow-md',
                      )}
                      style={{ height: `${Math.max(pct, val > 0 ? 6 : 0)}%`, minHeight: val > 0 ? 6 : 0 }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d, i) => (
          <span key={`${d.label}-label-${i}`} className="flex-1 truncate text-center text-[10px] text-slate-400">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const ATTENDANCE_SERIES = [
  { key: 'male' as const, label: 'Male', bar: 'bg-gradient-to-t from-brand-700 to-brand-500' },
  { key: 'female' as const, label: 'Female', bar: 'bg-gradient-to-t from-flame to-flame-orange' },
  { key: 'children' as const, label: 'Children', bar: 'bg-gradient-to-t from-gold to-gold-light' },
  { key: 'newcomers' as const, label: 'Newcomers', bar: 'bg-gradient-to-t from-emerald-600 to-emerald-400' },
];

export function AttendanceTrendChart({
  data,
  height = 320,
  onSessionClick,
}: {
  data: {
    id: string;
    label: string;
    title?: string;
    male: number;
    female: number;
    children: number;
    newcomers: number;
  }[];
  height?: number;
  onSessionClick?: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<{ i: number; key: (typeof ATTENDANCE_SERIES)[number]['key'] } | null>(
    null,
  );

  const max = Math.max(
    1,
    ...data.flatMap((d) => [d.male, d.female, d.children, d.newcomers]),
  );

  const plotHeight = height - LEGEND_ROW - LABEL_ROW - 8;

  const legendSwatch: Record<string, string> = {
    male: 'bg-brand-600',
    female: 'bg-flame-orange',
    children: 'bg-gold',
    newcomers: 'bg-emerald-500',
  };

  return (
    <div style={{ height }}>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ minHeight: LEGEND_ROW }}>
        {ATTENDANCE_SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className={cn('h-2.5 w-2.5 rounded-sm', legendSwatch[s.key])} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="flex items-end gap-1.5 sm:gap-2" style={{ height: plotHeight }}>
        {data.map((d, i) => (
          <div
            key={d.id}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex h-full w-full items-end justify-center gap-0.5">
              {ATTENDANCE_SERIES.map((s) => {
                const val = d[s.key];
                const pct = (val / max) * 100;
                const active = hovered?.i === i && hovered.key === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    className="relative flex h-full flex-1 flex-col justify-end"
                    onMouseEnter={() => setHovered({ i, key: s.key })}
                    onClick={() => onSessionClick?.(d.id)}
                    title={`${d.title ?? d.label} — ${s.label}: ${val}`}
                  >
                    {active && (
                      <div className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg">
                        {s.label}: {val}
                      </div>
                    )}
                    <div
                      className={cn('w-full rounded-t transition-all', s.bar, active && 'shadow-md')}
                      style={{ height: `${Math.max(pct, val > 0 ? 6 : 0)}%`, minHeight: val > 0 ? 6 : 0 }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2">
        {data.map((d) => (
          <button
            key={`${d.id}-label`}
            type="button"
            onClick={() => onSessionClick?.(d.id)}
            className="min-w-0 flex-1 truncate text-center text-[10px] text-slate-400 hover:text-violet-600 hover:underline"
            title={d.title}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
