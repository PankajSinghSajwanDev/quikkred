'use client';

import Link from 'next/link';
import { PermissionChips } from '@/components/PermissionMatrix';
import { hasAnyPermission, type Permissions } from '@/lib/rbac';

type Props = {
  permissions?: Permissions;
  compact?: boolean;
};

export function MyAccessCard({ permissions, compact = false }: Props) {
  if (!hasAnyPermission(permissions)) return null;

  if (compact) {
    return (
      <div className="mt-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
          Your access
        </p>
        <PermissionChips permissions={permissions} />
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-[#D7F0E6] bg-[#F3FBF7] px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#1F2937]">Your permissions</p>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            Only you can see this. Use Admin login with this email to use these
            rights.
          </p>
        </div>
        <Link
          href="/admin/login"
          className="text-xs font-semibold text-[#2f9a74] hover:underline"
        >
          Admin login →
        </Link>
      </div>
      <div className="mt-2.5">
        <PermissionChips permissions={permissions} />
      </div>
    </section>
  );
}
