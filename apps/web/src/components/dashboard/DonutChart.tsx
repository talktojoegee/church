'use client';

import { useState } from 'react';
import { cn, responsiveFigureClass } from '@/lib/utils';

const PALETTE = [
  { fill: '#8b5cf6', label: 'text-violet-700', bg: 'bg-violet-500' },
  { fill: '#3b82f6', label: 'text-blue-700', bg: 'bg-blue-500' },
  { fill: '#10b981', label: 'text-emerald-700', bg: 'bg-emerald-500' },
  { fill: '#f59e0b', label: 'text-amber-700', bg: 'bg-amber-500' },
  { fill: '#ec4899', label: 'text-pink-700', bg: 'bg-pink-500' },
  { fill: '#06b6d4', label: 'text-cyan-700', bg: 'bg-cyan-500' },
  { fill: '#64748b', label: 'text-slate-600', bg: 'bg-slate-400' },
];

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  formatValue,
}: {
  data: { label: string; value: number }[];
  centerLabel?: string;
  centerValue?: string | number;
  formatValue?: (v: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const displayCenter = centerValue ?? total;
  const centerText = typeof displayCenter === 'number' && formatValue
    ? formatValue(displayCenter)
    : String(displayCenter);

  let cumulative = 0;
  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start, i, color: PALETTE[i % PALETTE.length] };
  });

  const r = 40;
  const cx = 50;
  const cy = 50;

  function arc(startPct: number, endPct: number) {
    const start = startPct * 2 * Math.PI - Math.PI / 2;
    const end = endPct * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = endPct - startPct > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          {segments.map((s) => (
            <path
              key={s.label}
              d={arc(s.start, s.start + s.pct)}
              fill={s.color.fill}
              className={cn(
                'origin-center transition-all duration-200',
                hovered === null || hovered === s.i ? 'opacity-100' : 'opacity-40',
                hovered === s.i && 'drop-shadow-md',
              )}
              style={{ transform: hovered === s.i ? 'scale(1.04)' : 'scale(1)' }}
              onMouseEnter={() => setHovered(s.i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          <circle cx={cx} cy={cy} r={26} fill="white" />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3">
          <span
            className={cn(
              'max-w-full text-center font-bold tabular-nums text-slate-900',
              responsiveFigureClass(centerText, 'donut'),
            )}
          >
            {centerText}
          </span>
          {centerLabel && (
            <span className="mt-0.5 max-w-full truncate text-center text-[9px] text-slate-400">
              {centerLabel}
            </span>
          )}
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {segments.map((s) => (
          <li
            key={s.label}
            className={cn(
              'flex cursor-default items-center justify-between rounded-lg px-2 py-1 text-sm transition',
              hovered === s.i && 'bg-slate-50',
            )}
            onMouseEnter={() => setHovered(s.i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="flex items-center gap-2 truncate">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', s.color.bg)} />
              <span className="truncate text-slate-600">{s.label}</span>
            </span>
            <span
              className={cn(
                'ml-2 shrink-0 text-right font-semibold tabular-nums text-slate-900',
                formatValue && responsiveFigureClass(formatValue(s.value), 'compact'),
              )}
            >
              {formatValue ? formatValue(s.value) : s.value}
              <span className="ml-1 text-xs font-normal text-slate-400">
                ({Math.round(s.pct * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
