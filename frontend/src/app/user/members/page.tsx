'use client';

import { useEffect, useState } from 'react';
import { MemberList } from '@/components/members/MemberList';
import { UserShell, useUserSession } from '@/components/UserShell';
import { hasGrant } from '@/lib/rbac';
import type { TeamMember } from '@/lib/team';
import { userApi } from '@/lib/userApi';

function MembersBody() {
  const me = useUserSession();
  const allowed = hasGrant(me.permissions, 'team', 'read');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    void userApi<TeamMember[]>('/user/members')
      .then((data) => {
        setMembers(data);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load members');
      })
      .finally(() => setLoading(false));
  }, [allowed]);

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-dashed border-[#CBD5E0] bg-white px-4 py-14 text-center">
        <p className="text-sm font-semibold text-[#2D3748]">No access</p>
        <p className="mt-1 text-sm text-[#718096]">
          You need Members Read permission to view this list.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="hidden lg:block">
        <h2 className="text-2xl font-semibold tracking-tight text-[#1F2937]">
          Members
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          People in your workspace
        </p>
      </div>
      <p className="text-sm text-[#6B7280] lg:hidden">
        {members.length} people
      </p>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="py-12 text-center text-sm text-[#6B7280]">Loading members…</p>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CBD5E0] bg-white px-4 py-14 text-center">
          <p className="text-sm font-semibold text-[#2D3748]">No members yet</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border-0 bg-transparent lg:border lg:border-[#E5E7EB] lg:bg-white lg:p-4">
          <MemberList members={members} showPermissions={false} />
        </section>
      )}
    </div>
  );
}

export default function UserMembersPage() {
  return (
    <UserShell>
      <MembersBody />
    </UserShell>
  );
}
