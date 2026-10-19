'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MyAccessCard } from '@/components/MyAccessCard';
import { UserShell, useUserSession } from '@/components/UserShell';
import { hasGrant, memberCan } from '@/lib/rbac';
import { userApi } from '@/lib/userApi';

type Dashboard = {
  assignedTasks: number;
  createdTasks: number;
  unreadNotifications: number;
};

function DashboardBody() {
  const user = useUserSession();
  const [stats, setStats] = useState<Dashboard>({
    assignedTasks: 0,
    createdTasks: 0,
    unreadNotifications: 0,
  });

  useEffect(() => {
    void userApi<Dashboard>('/user/dashboard')
      .then(setStats)
      .catch(() => undefined);
  }, []);

  return (
      <div className="mx-auto max-w-5xl space-y-4 lg:space-y-6">
        <div className="hidden lg:block">
          <h2 className="text-2xl font-semibold tracking-tight text-[#1F2937]">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Your tasks and notifications
          </p>
        </div>
        <p className="text-sm text-[#6B7280] lg:hidden">
          Your tasks and notifications
        </p>

        <MyAccessCard permissions={user.permissions} />

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-3">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 lg:p-5">
            <p className="text-xs text-[#6B7280] lg:text-sm">Assigned to me</p>
            <p className="mt-1.5 text-2xl font-semibold text-[#1F2937] lg:mt-2 lg:text-3xl">
              {stats.assignedTasks}
            </p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 lg:p-5">
            <p className="text-xs text-[#6B7280] lg:text-sm">Created by me</p>
            <p className="mt-1.5 text-2xl font-semibold text-[#1F2937] lg:mt-2 lg:text-3xl">
              {stats.createdTasks}
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-[#E5E7EB] bg-white p-3.5 lg:col-span-1 lg:p-5">
            <p className="text-xs text-[#6B7280] lg:text-sm">Unread alerts</p>
            <p className="mt-1.5 text-2xl font-semibold text-[#1F2937] lg:mt-2 lg:text-3xl">
              {stats.unreadNotifications}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:gap-3">
          {hasGrant(user.permissions, 'team', 'read') ? (
            <Link
              href="/user/members"
              className="rounded-xl border border-[#E5E7EB] bg-white p-4 transition active:bg-[#F9FAFB] lg:p-5 lg:hover:border-[#3EB489]"
            >
              <h3 className="text-base font-semibold text-[#1F2937]">Members</h3>
              <p className="mt-1 text-sm text-[#6B7280]">
                View people in your workspace.
              </p>
              <p className="mt-3 text-sm font-medium text-[#3EB489] lg:mt-4">
                Open →
              </p>
            </Link>
          ) : null}
          <Link
            href="/user/tasks"
            className="rounded-xl border border-[#E5E7EB] bg-white p-4 transition active:bg-[#F9FAFB] lg:p-5 lg:hover:border-[#3EB489]"
          >
            <h3 className="text-base font-semibold text-[#1F2937]">Tasks</h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              {memberCan(user.permissions, 'tasks', 'create')
                ? 'Create tasks and assign them to teammates.'
                : 'View and update tasks assigned to you.'}
            </p>
            <p className="mt-3 text-sm font-medium text-[#3EB489] lg:mt-4">
              Open →
            </p>
          </Link>
          <Link
            href="/user/notifications"
            className="rounded-xl border border-[#E5E7EB] bg-white p-4 transition active:bg-[#F9FAFB] lg:p-5 lg:hover:border-[#3EB489]"
          >
            <h3 className="text-base font-semibold text-[#1F2937]">
              Notifications
            </h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              See when a task is assigned to you.
            </p>
            <p className="mt-3 text-sm font-medium text-[#3EB489] lg:mt-4">
              Open →
            </p>
          </Link>
        </div>
      </div>
  );
}

export default function UserDashboardPage() {
  return (
    <UserShell>
      <DashboardBody />
    </UserShell>
  );
}
