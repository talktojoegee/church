'use client';

import { X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

export interface DateRangeValue {
  from: string;
  to: string;
}

export function FinanceDateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
}) {
  const active = Boolean(value.from || value.to);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_auto]">
        <Input
          label="From"
          type="date"
          className="py-2.5"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
        <Input
          label="To"
          type="date"
          className="py-2.5"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
        {active && (
          <div className="flex items-end pb-0.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({ from: '', to: '' })}
            >
              <X size={14} /> Clear dates
            </Button>
          </div>
        )}
      </div>
      {active && (
        <p className="text-xs text-slate-500">
          Showing
          {value.from ? ` from ${formatDate(value.from)}` : ''}
          {value.to ? ` to ${formatDate(value.to)}` : ''}
        </p>
      )}
    </div>
  );
}
