import { cn } from '@/lib/utils';

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn('border-b border-slate-100 px-4 py-3 text-slate-700 dark:border-slate-800 dark:text-slate-300', className)}>
      {children}
    </td>
  );
}

/** Row number for paginated tables. */
export function rowNumber(page: number, pageSize: number, index: number): number {
  return (page - 1) * pageSize + index + 1;
}

export function SerialTh({ className }: { className?: string }) {
  return <Th className={cn('w-12 text-center', className)}>#</Th>;
}

export function SerialTd({
  page = 1,
  pageSize = 20,
  index,
  className,
}: {
  page?: number;
  pageSize?: number;
  index: number;
  className?: string;
}) {
  return (
    <Td className={cn('w-12 text-center tabular-nums text-slate-400', className)}>
      {rowNumber(page, pageSize, index)}
    </Td>
  );
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-400">
        {message}
      </td>
    </tr>
  );
}
