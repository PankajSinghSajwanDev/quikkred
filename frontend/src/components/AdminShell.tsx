'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { QuikkredLogo } from '@/components/QuikkredLogo';
import {
  adminApi,
  getAdminToken,
  setAdminToken,
} from '@/lib/adminApi';
import {
  can,
  canAccessList,
  canAny,
  isSuperAdmin,
  type AdminSession,
} from '@/lib/rbac';
import { adminPathAllowed } from '@/lib/routeAccess';

const AdminSessionContext = createContext<AdminSession | null>(null);

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error('useAdminSession must be used within AdminShell');
  }
  return ctx;
}

type NavLink = {
  href: string;
  label: string;
  exact?: boolean;
  match?: (pathname: string) => boolean;
  icon: React.ReactNode;
};

function navLinksFor(admin: AdminSession): NavLink[] {
  const items: NavLink[] = [
    {
      href: '/admin',
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

  if (canAny(admin, 'team')) {
    items.push({
      href: '/admin/team',
      label: 'Members',
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

  if (canAny(admin, 'tasks')) {
    items.push({
      href: canAccessList(admin, 'tasks')
        ? '/admin/tasks/list'
        : '/admin/tasks/new',
      label: 'Task',
      match: (pathname) => pathname.startsWith('/admin/tasks'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="4" y="4" width="16" height="16" rx="3.2" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M8 12.1l2.1 2.1L16 9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    });
  }

  if (can(admin, 'tasks', 'read')) {
    items.push({
      href: '/admin/logs',
      label: 'Logs',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 5h14v14H5z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M8 9h8M8 12h8M8 15h5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ),
    });
  }

  return items;
}

function getBreadcrumbs(pathname: string) {
  const crumbs: { label: string; href?: string }[] = [
    { label: 'Admin', href: '/admin' },
  ];

  if (pathname === '/admin') {
    crumbs.push({ label: 'Dashboard' });
    return crumbs;
  }
  if (pathname.startsWith('/admin/logs')) {
    crumbs.push({ label: 'Logs' });
    return crumbs;
  }
  if (pathname.startsWith('/admin/team')) {
    crumbs.push({ label: 'Members' });
    return crumbs;
  }
  if (pathname.startsWith('/admin/tasks/list')) {
    crumbs.push({ label: 'Task' });
    return crumbs;
  }
  if (pathname.startsWith('/admin/tasks/new')) {
    crumbs.push({ label: 'Task', href: '/admin/tasks/list' });
    crumbs.push({ label: pathname.includes('edit=') ? 'Edit' : 'Create' });
    return crumbs;
  }
  if (/^\/admin\/tasks\/[a-fA-F0-9]{24}(\/|$)/.test(pathname)) {
    crumbs.push({ label: 'Task', href: '/admin/tasks/list' });
    crumbs.push({ label: 'Details' });
    return crumbs;
  }
  if (pathname.startsWith('/admin/tasks')) {
    crumbs.push({ label: 'Task' });
    return crumbs;
  }

  crumbs.push({ label: 'Page' });
  return crumbs;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [open, setOpen] = useState(false);
  const breadcrumbs = getBreadcrumbs(pathname);
  const links = useMemo(() => (admin ? navLinksFor(admin) : []), [admin]);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setAdminToken(null);
      router.replace('/admin/login');
      return;
    }
    setAdminToken(token);

    void adminApi<AdminSession>('/admin/me')
      .then(setAdmin)
      .catch(() => {
        setAdminToken(null);
        router.replace('/admin/login');
      });
  }, [router]);

  useEffect(() => {
    if (!admin) return;
    if (!adminPathAllowed(admin, pathname)) {
      setAdminToken(null);
      router.replace('/admin/login');
    }
  }, [admin, pathname, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const logout = () => {
    setAdminToken(null);
    router.push('/admin/login');
  };

  if (!admin || !adminPathAllowed(admin, pathname)) {
    return (
      <div className="dot-bg flex min-h-screen items-center justify-center text-[#6B7280]">
        Loading…
      </div>
    );
  }

  const roleLabel = isSuperAdmin(admin) ? 'Admin' : 'Sub-admin';

  return (
    <AdminSessionContext.Provider value={admin}>
      <div className="dot-bg min-h-screen text-[#1F2937]">
        {/* Mobile top bar — phone only */}
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
              <Link
                href="/admin"
                className="pointer-events-auto"
                aria-label="Quikkred home"
              >
                <QuikkredLogo size="sm" variant="inline" />
              </Link>
            </div>

            {/* Balances hamburger so logo stays optically centered */}
            <div className="ml-auto h-9 w-9 shrink-0" aria-hidden />
          </div>
        </header>

        {/* Sidebar drawer (mobile) / fixed (desktop) */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[min(17.5rem,85vw)] flex-col border-r border-[#E5E7EB] bg-white shadow-xl transition-transform duration-200 lg:w-60 lg:shadow-none lg:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] px-3 lg:h-16 lg:px-4">
            <Link
              href="/admin"
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

          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
            {links.map((link) => {
              const active = link.match
                ? link.match(pathname)
                : link.exact
                  ? pathname === link.href
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition lg:py-2.5 ${
                    active
                      ? 'bg-[#E8F8F1] text-[#2f9a74]'
                      : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]'
                  }`}
                >
                  <span className={active ? 'text-[#3EB489]' : 'text-[#9CA3AF]'}>
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="shrink-0 space-y-2 border-t border-[#E5E7EB] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2.5 px-2 py-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3EB489] text-xs font-semibold text-white">
                {admin.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#1F2937]">
                  {admin.username}
                </p>
                <p className="truncate text-xs text-[#9CA3AF]">{roleLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-sm font-medium text-[#4B5563] transition hover:border-[#FECACA] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
            >
              Logout
            </button>
          </div>
        </aside>

        {open ? (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/35 lg:hidden"
            onClick={() => setOpen(false)}
          />
        ) : null}

        <div className="min-h-screen lg:pl-60">
          {/* Desktop breadcrumb */}
          <div className="hidden border-b border-[#E5E7EB] bg-white px-8 py-3 lg:block">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-sm text-[#9CA3AF]"
            >
              {breadcrumbs.map((crumb, i) => {
                const last = i === breadcrumbs.length - 1;
                return (
                  <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                    {i > 0 ? <span className="text-[#D1D5DB]">/</span> : null}
                    {crumb.href && !last ? (
                      <Link href={crumb.href} className="hover:text-[#3EB489]">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={last ? 'font-medium text-[#1F2937]' : ''}>
                        {crumb.label}
                      </span>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>

          <main className="px-3 py-3 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </AdminSessionContext.Provider>
  );
}
