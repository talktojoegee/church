import { BadRequestException } from '@nestjs/common';
import { BulkSmsRecurrence } from '@prisma/client';

export const SMS_WEEKDAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
] as const;

export function formatRecurrenceDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  return sorted
    .map((d) => SMS_WEEKDAYS.find((w) => w.value === d)?.short ?? String(d))
    .join(', ');
}

function applyScheduledTime(base: Date, scheduledAt: Date): Date {
  const d = new Date(base);
  d.setHours(
    scheduledAt.getHours(),
    scheduledAt.getMinutes(),
    scheduledAt.getSeconds(),
    0,
  );
  return d;
}

/** Next run strictly after `from`, using time-of-day from `scheduledAt`. */
export function computeNextWeeklyRun(
  scheduledAt: Date,
  recurrenceDays: number[],
  from: Date,
): Date | null {
  const days = [...new Set(recurrenceDays)].sort((a, b) => a - b);
  if (!days.length) return null;

  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(from);
    candidate.setDate(from.getDate() + offset);
    candidate.setHours(0, 0, 0, 0);
    if (!days.includes(candidate.getDay())) continue;

    const runAt = applyScheduledTime(candidate, scheduledAt);
    if (runAt > from) return runAt;
  }

  return null;
}

export function computeInitialNextRunAt(
  scheduledAt: Date,
  recurrence: BulkSmsRecurrence,
  recurrenceDays: number[],
  now = new Date(),
): Date {
  if (scheduledAt <= now) {
    throw new BadRequestException('Scheduled time must be in the future');
  }

  if (recurrence === BulkSmsRecurrence.ONCE) {
    return scheduledAt;
  }

  if (!recurrenceDays.length) {
    throw new BadRequestException('Select at least one day for recurring SMS');
  }

  if (recurrenceDays.includes(scheduledAt.getDay())) {
    return scheduledAt;
  }

  const next = computeNextWeeklyRun(scheduledAt, recurrenceDays, now);
  if (!next) {
    throw new BadRequestException('Could not compute the next run time');
  }
  return next;
}

export function computeFollowingWeeklyRun(
  scheduledAt: Date,
  recurrenceDays: number[],
  lastRunAt: Date,
): Date | null {
  return computeNextWeeklyRun(scheduledAt, recurrenceDays, lastRunAt);
}
