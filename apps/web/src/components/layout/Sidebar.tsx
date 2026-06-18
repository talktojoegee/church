'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useChurchBranding } from '@/lib/hooks';
import { NAVIGATION } from '@/config/navigation';
import { ChurchLogo } from '@/components/layout/ChurchLogo';
import { cn } from '@/lib/utils';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const branding = useChurchBranding();

  const canSee = (perms: string[]) => {
    if (perms.length === 0) return true;
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return perms.some((p) => user.permissions.includes(p));
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900">
      <div className="flex h-16 items-center border-b border-slate-800 px-4">
        <Link href="/dashboard" onClick={onNavigate} className="min-w-0 flex-1">
          <ChurchLogo
            name={branding.data?.name}
            logoUrl={branding.data?.logoUrl}
            variant="sidebar"
            showName={!branding.data?.logoUrl}
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAVIGATION.map((section) => {
          const visible = section.items.filter((i) => canSee(i.permissions));
          if (visible.length === 0) return null;
          return (
            <div key={section.title}>
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {section.title}
              </p>
              <ul className="space-y-1">
                {visible.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;
                  const content = (
                    <span
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                        active
                          ? 'bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/30'
                          : item.enabled
                            ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            : 'cursor-not-allowed text-slate-600',
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" size={18} />
                      <span className="flex-1">{item.label}</span>
                      {!item.enabled && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                          Soon
                        </span>
                      )}
                    </span>
                  );

                  return (
                    <li key={item.href}>
                      {item.enabled ? (
                        <Link href={item.href} onClick={onNavigate}>
                          {content}
                        </Link>
                      ) : (
                        <div aria-disabled>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
