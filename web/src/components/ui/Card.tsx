import { cn, responsiveFigureClass } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p
            className={cn(
              'mt-2 font-bold tabular-nums leading-tight tracking-tight text-slate-900',
              responsiveFigureClass(value, 'compact'),
            )}
          >
            {value}
          </p>
          {hint && <p className="mt-1 truncate text-xs text-slate-400">{hint}</p>}
        </div>
        {icon && (
          <div className="shrink-0 rounded-lg bg-brand-50 p-2.5 text-brand-600">{icon}</div>
        )}
      </div>
    </Card>
  );
}

const COLOR_SCHEMES = {
  brand: {
    bg: 'from-brand-700 to-brand-500',
    ring: 'ring-brand-200',
    icon: 'bg-white/20 text-white',
  },
  violet: {
    bg: 'from-brand-800 to-brand-600',
    ring: 'ring-brand-200',
    icon: 'bg-white/20 text-white',
  },
  blue: {
    bg: 'from-brand-700 to-flame-orange',
    ring: 'ring-orange-200',
    icon: 'bg-white/20 text-white',
  },
  emerald: {
    bg: 'from-emerald-500 to-teal-600',
    ring: 'ring-emerald-200',
    icon: 'bg-white/20 text-white',
  },
  amber: {
    bg: 'from-amber-500 to-orange-500',
    ring: 'ring-amber-200',
    icon: 'bg-white/20 text-white',
  },
  rose: {
    bg: 'from-rose-500 to-pink-600',
    ring: 'ring-rose-200',
    icon: 'bg-white/20 text-white',
  },
  indigo: {
    bg: 'from-brand-900 to-brand-700',
    ring: 'ring-brand-200',
    icon: 'bg-white/20 text-white',
  },
} as const;

export function ColorStatCard({
  label,
  value,
  hint,
  icon,
  color = 'violet',
  active,
  onClick,
  dense = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  color?: keyof typeof COLOR_SCHEMES;
  active?: boolean;
  onClick?: () => void;
  /** Smaller figures for tight layouts (e.g. modals). */
  dense?: boolean;
}) {
  const scheme = COLOR_SCHEMES[color];
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br text-left text-white shadow-lg transition',
        dense ? 'p-3' : 'p-4 sm:p-5',
        scheme.bg,
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-xl active:scale-[0.99]',
        active && `ring-4 ${scheme.ring}`,
      )}
    >
      <div className="relative z-10 flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn('font-medium text-white/80', dense ? 'text-xs' : 'text-sm')}>{label}</p>
          <p
            className={cn(
              'mt-1 font-bold tabular-nums leading-tight tracking-tight',
              dense
                ? responsiveFigureClass(value, 'donut')
                : responsiveFigureClass(value, 'colorStat'),
            )}
          >
            {value}
          </p>
          {hint && <p className="mt-1 truncate text-xs text-white/70">{hint}</p>}
        </div>
        {icon && (
          <div className={cn('shrink-0 rounded-xl backdrop-blur-sm', dense ? 'p-2' : 'p-2.5', scheme.icon)}>
            {icon}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/5" />
    </Tag>
  );
}

export function BranchCard({
  name,
  code,
  location,
  memberCount,
  isMain,
  isActive,
  onClick,
}: {
  name: string;
  code: string;
  location?: string;
  memberCount: number;
  isMain?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition',
        onClick && 'cursor-pointer hover:border-brand-300 hover:shadow-md',
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow">
          <span className="text-sm font-bold">{code.slice(0, 3)}</span>
        </div>
        <div className="flex gap-1">
          {isMain && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
              Main
            </span>
          )}
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
            )}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">{name}</h3>
      <p className="mt-1 text-sm text-slate-500">{location || 'No location set'}</p>
      <p className="mt-3 text-sm font-medium text-slate-700">
        {memberCount} member{memberCount === 1 ? '' : 's'}
      </p>
    </Tag>
  );
}
