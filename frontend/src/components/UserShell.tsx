'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { MyAccessCard } from '@/components/MyAccessCard';
import { QuikkredLogo } from '@/components/QuikkredLogo';
import { getUserToken, setUserToken, userApi } from '@/lib/userApi';
import type { UserSession } from '@/lib/user';
import { hasGrant } from '@/lib/rbac';
import { userPathAllowed } from '@/lib/routeAccess';
import {
  connectUserSocket,
  disconnectUserSocket,
} from '@/lib/userSocket';

const UserSessionContext = createContext<UserSession | null>(null);

export function useUserSession() {
  const ctx = useContext(UserSessionContext);
  if (!ctx) {
    throw new Error('useUserSession must be used within UserShell');
  }
  return ctx;
}

function navLinksFor(user: UserSession) {
  const items = [
    {
      href: '/user',
      label: 'Dashboard',
      exact: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      ),
    },
  ];

  if (hasGrant(user.permissions, 'team', 'read')) {
    items.push({
      href: '/user/members',
      label: 'Members',
      exact: false,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M3.8 18.2c.7-2.7 2.6-4 5.2-4s4.5 1.3 5.2 4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M16.2 14.2c1.7.3 3 1.4 3.6 3"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ),
    });
  }

  items.push(
    {
      href: '/user/tasks',
      label: 'Tasks',
      exact: false,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      href: '/user/notifications',
      label: 'Notifications',
      exact: false,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 9a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M10 19a2 2 0 004 0"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  );

  return items;
}

function BellIcon({ active }: { active?: boolean }) {
  const stroke = active ? '#2f9a74' : '#334155';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.25a4.5 4.5 0 00-4.5 4.5v1.1c0 1.35-.4 2.67-1.15 3.8L5.7 14.8a1.1 1.1 0 00.93 1.7h10.74a1.1 1.1 0 00.93-1.7l-.65-1.15A7.1 7.1 0 0116.5 9.85v-1.1A4.5 4.5 0 0012 4.25z"
        fill={active ? '#3EB489' : '#94A3B8'}
        fillOpacity={active ? 0.14 : 0.1}
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.75 17.75a2.25 2.25 0 004.5 0"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="4.1" r="0.9" fill={stroke} />
    </svg>
  );
}

function NotificationBell({ unread }: { unread: number }) {
  const label =
    unread > 0
      ? `${unread} unread notification${unread === 1 ? '' : 's'}`
      : 'Notifications';
  const active = unread > 0;

  return (
    <Link
      href="/user/notifications"
      aria-label={label}
      className="group relative z-10 inline-flex shrink-0"
    >
      <span
        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition duration-200 ${
          active
            ? 'bg-[#E8F8F1] text-[#2f9a74] shadow-[inset_0_0_0_1px_rgba(62,180,137,0.35),0_4px_12px_rgba(62,180,137,0.18)]'
            : 'bg-[#F8FAFC] text-[#334155] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] group-hover:bg-[#E8F8F1] group-hover:text-[#2f9a74] group-hover:shadow-[inset_0_0_0_1px_rgba(62,180,137,0.3),0_4px_12px_rgba(62,180,137,0.12)]'
        }`}
      >
        <span className="transition-transform duration-200 ease-out group-hover:-rotate-12 group-active:scale-95">
          <BellIcon active={active} />
        </span>
        {active ? (
          <span
            className="pointer-events-none absolute inset-0 rounded-full bg-[#3EB489]/15 animate-ping"
            style={{ animationDuration: '2.2s' }}
            aria-hidden
          />
        ) : null}
      </span>

      {active ? (
        <span className="absolute -top-0.5 -right-0.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#111827] px-1.5 text-[10px] font-bold tabular-nums tracking-tight text-white shadow-[0_2px_6px_rgba(15,23,42,0.25)] ring-2 ring-white">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  );
}

export function UserShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(() => {
    if (!getUserToken()) return;
    void userApi<{ count: number }>('/user/notifications/unread-count')
      .then((d) => setUnread(d.count))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const token = getUserToken();
    if (!token) {
      setUserToken(null);
      router.replace('/user/login');
      return;
    }
    setUserToken(token);

    void userApi<UserSession>('/user/me')
      .then(setUser)
      .catch(() => {
        setUserToken(null);
        router.replace('/user/login');
      });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    if (!userPathAllowed(user, pathname)) {
      setUserToken(null);
      router.replace('/user/login');
    }
  }, [user, pathname, router]);

  useEffect(() => {
    refreshUnread();
  }, [pathname, refreshUnread]);

  // Live push: update bell instantly when a task is assigned
  useEffect(() => {
    if (!user) return;

    const sock = connectUserSocket();
    if (!sock) return;

    const onNew = () => {
      setUnread((n) => n + 1);
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    };
    const onChanged = () => refreshUnread();

    sock.on('notification:new', onNew);
    sock.on('connect', refreshUnread);
    window.addEventListener('notifications:changed', onChanged);
    window.addEventListener('focus', onChanged);

    return () => {
      sock.off('notification:new', onNew);
      sock.off('connect', refreshUnread);
      window.removeEventListener('notifications:changed', onChanged);
      window.removeEventListener('focus', onChanged);
    };
  }, [user, refreshUnread]);

  const logout = () => {
    disconnectUserSocket();
    setUserToken(null);
    router.replace('/user/login');
  };

  if (!user || !userPathAllowed(user, pathname)) {
    return (
      <div className="dot-bg flex min-h-screen items-center justify-center text-sm text-[#718096]">
        Loading…
      </div>
    );
  }

  return (
    <div className="dot-bg min-h-screen text-[#1F2937]">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-white lg:hidden">
        <div className="relative flex h-12 items-center px-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open sidebar"
            className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Link href="/user" className="pointer-events-auto" aria-label="Home">
              <QuikkredLogo size="sm" variant="inline" />
            </Link>
          </div>
          <div className="relative z-10 ml-auto">
            <NotificationBell unread={unread} />
          </div>
        </div>
      </header>

      {/* Desktop top bar */}
      <header className="sticky top-0 z-30 hidden border-b border-[#E5E7EB] bg-white/95 backdrop-blur lg:block lg:pl-60">
        <div className="flex h-14 items-center justify-between px-8">
          <p className="text-sm text-[#6B7280]">
            Signed in as{' '}
            <span className="font-semibold text-[#111827]">{user.name}</span>
          </p>
          <NotificationBell unread={unread} />
        </div>
      </header>

      {open ? (
        <button
          type="button"
          aria-label="Close overlay"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[min(17.5rem,85vw)] flex-col border-r border-[#E5E7EB] bg-white shadow-xl transition-transform duration-200 lg:w-60 lg:shadow-none lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] px-3 lg:h-16 lg:px-4">
          <Link
            href="/user"
            className="block min-w-0 flex-1 overflow-hidden rounded-lg"
            onClick={() => setOpen(false)}
          >
            <QuikkredLogo size="sm" variant="inline" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
            className="ml-2 flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] lg:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="border-b border-[#E5E7EB] px-4 py-3">
          <p className="truncate text-sm font-semibold text-[#111827]">{user.name}</p>
          <p className="truncate text-xs text-[#6B7280]">{user.email}</p>
          <MyAccessCard compact permissions={user.permissions} />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {navLinksFor(user).map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-[#E8F8F1] text-[#2f9a74]'
                    : 'text-[#4B5563] hover:bg-[#F9FAFB]'
                }`}
              >
                {link.icon}
                <span className="flex-1">{link.label}</span>
                {link.href === '/user/notifications' && unread > 0 ? (
                  <span className="rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E5E7EB] p-3">
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#F3F4F6]"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <main className="px-3 py-3 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <UserSessionContext.Provider value={user}>
            {children}
          </UserSessionContext.Provider>
        </main>
      </div>
    </div>
  );
}
