'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, KeyRound, LogOut, Menu, UserCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { UserAvatar } from '@/components/users/UserAvatar';
import { cn } from '@/lib/utils';

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const handleLogout = async () => {
    close();
    await logout();
    router.replace('/login');
  };

  const menuItems = [
    {
      label: 'My profile',
      href: '/profile',
      icon: UserCircle,
    },
    {
      label: 'Change password',
      href: '/profile?tab=security',
      icon: KeyRound,
    },
  ];

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
            className={cn(
              'flex items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 transition sm:gap-3',
              open
                ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800',
            )}
          >
            <UserAvatar
              avatarUrl={user?.avatarUrl}
              firstName={user?.firstName ?? ''}
              lastName={user?.lastName ?? ''}
              size="sm"
            />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.roles?.[0] ?? 'User'}</p>
            </div>
            <ChevronDown
              size={16}
              className={cn(
                'hidden text-slate-400 transition sm:block',
                open && 'rotate-180',
              )}
            />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={close} />
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                </div>

                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={close}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
                  >
                    <item.icon size={16} className="text-slate-400" />
                    {item.label}
                  </Link>
                ))}

                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
