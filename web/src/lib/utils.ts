import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency = 'NGN',
  locale = 'en-NG',
) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    amount,
  );
}

export function formatDate(value: string | Date | null | undefined, includeTime = false) {
  if (!value) return '—';
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  if (includeTime) {
    opts.hour = '2-digit';
    opts.minute = '2-digit';
  }
  return new Date(value).toLocaleDateString('en-NG', opts);
}

function parseLocalDate(value: string | Date): Date {
  if (typeof value === 'string') {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/** Weekdays (Mon–Fri) between two dates, inclusive. Returns 0 if end is before start. */
export function countWorkingDays(start: string | Date, end: string | Date): number {
  if (!start || !end) return 0;
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  if (endDate < startDate) return 0;

  let count = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Tailwind classes that scale figure text down as strings grow (currency, counts). */
export function responsiveFigureClass(
  value: string | number,
  variant: 'stat' | 'donut' | 'compact' | 'colorStat' = 'stat',
): string {
  const len = String(value).length;
  if (variant === 'donut') {
    if (len > 16) return 'text-[8px] leading-none';
    if (len > 13) return 'text-[9px] leading-none';
    if (len > 10) return 'text-[10px] leading-tight';
    if (len > 7) return 'text-xs leading-tight';
    return 'text-sm leading-tight';
  }
  if (variant === 'compact') {
    if (len > 14) return 'text-sm';
    if (len > 11) return 'text-base';
    if (len > 8) return 'text-lg';
    return 'text-xl';
  }
  if (variant === 'colorStat') {
    if (len > 16) return 'text-xs sm:text-sm leading-tight';
    if (len > 13) return 'text-sm sm:text-base leading-tight';
    if (len > 10) return 'text-base sm:text-lg leading-tight';
    if (len > 7) return 'text-lg sm:text-xl leading-tight';
    return 'text-xl sm:text-2xl leading-tight';
  }
  // stat cards — tuned for 6-column grids with NGN amounts
  if (len > 17) return 'text-sm sm:text-base';
  if (len > 14) return 'text-base sm:text-lg';
  if (len > 11) return 'text-lg sm:text-xl';
  if (len > 8) return 'text-xl sm:text-2xl';
  return 'text-2xl sm:text-3xl';
}
