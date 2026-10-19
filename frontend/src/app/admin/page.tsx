'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell, useAdminSession } from '@/components/AdminShell';
import { adminApi } from '@/lib/adminApi';
import { can, canAccessList, canAny, isSuperAdmin } from '@/lib/rbac';
import type { TaskItem } from '@/lib/task';
import type { TeamMember } from '@/lib/team';

function DashboardHome() {
  const admin = useAdminSession();
  const [teamCount, setTeamCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);

  const showTeam = canAny(admin, 'team');
  const showTasks = canAccessList(admin, 'tasks');
  const showTaskCreate = can(admin, 'tasks', 'create');

  useEffect(() => {
    void Promise.all([
      showTeam
        ? adminApi<TeamMember[]>('/admin/team').catch(() => [] as TeamMember[])
        : Promise.resolve([] as TeamMember[]),
      showTasks
        ? adminApi<TaskItem[]>('/admin/tasks').catch(() => [] as TaskItem[])
        : Promise.resolve([] as TaskItem[]),
    ]).then(([team, tasks]) => {
      setTeamCount(team.length);
      setTaskCount(tasks.length);
      setDoneCount(tasks.filter((t) => t.status === 'done').length);
    });
  }, [showTeam, showTasks]);

  const openTasks = Math.max(taskCount - doneCount, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-4 lg:space-y-6">
      <div className="hidden lg:block">
        <h2 className="text-2xl font-semibold tracking-tight text-[#1F2937]">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          {isSuperAdmin(admin)
            ? 'Overview of your workspace'
            : 'You can only use the modules assigned to you'}
        </p>
      </div>

      <p className="text-sm text-[#6B7280] lg:hidden">
        {isSuperAdmin(admin)
          ? 'Overview of your workspace'
          : 'You can only use the modules assigned to you'}
      </p>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-3">
        {showTeam ? (
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 lg:p-5">
            <p className="text-xs text-[#6B7280] lg:text-sm">Members</p>
            <p className="mt-1.5 text-2xl font-semibold text-[#1F2937] lg:mt-2 lg:text-3xl">
              {teamCount}
            </p>
          </div>
        ) : null}
        {showTasks ? (
          <>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 lg:p-5">
              <p className="text-xs text-[#6B7280] lg:text-sm">Tasks</p>
              <p className="mt-1.5 text-2xl font-semibold text-[#1F2937] lg:mt-2 lg:text-3xl">
                {taskCount}
              </p>
              <p className="mt-1 text-[11px] text-[#9CA3AF] lg:text-xs">
                {openTasks} open · {doneCount} done
              </p>
            </div>
            <div className="col-span-2 rounded-xl border border-[#E5E7EB] bg-white p-3.5 lg:col-span-1 lg:p-5">
              <p className="text-xs text-[#6B7280] lg:text-sm">Completed</p>
              <p className="mt-1.5 text-2xl font-semibold text-[#1F2937] lg:mt-2 lg:text-3xl">
                {doneCount}
              </p>
            </div>
          </>
        ) : null}
        {!showTeam && !showTasks ? (
          <div className="col-span-2 rounded-xl border border-[#E5E7EB] bg-white p-4 lg:col-span-3 lg:p-5">
            <p className="text-sm font-medium text-[#1F2937]">
              No module access yet
            </p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Ask the admin to grant Create, Read, Update, or Delete permissions.
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:gap-3">
        {showTeam ? (
          <Link
            href="/admin/team"
            className="rounded-xl border border-[#E5E7EB] bg-white p-4 transition active:bg-[#F9FAFB] lg:p-5 lg:hover:border-[#3EB489]"
          >
            <h3 className="text-base font-semibold text-[#1F2937]">Members</h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              Add members, roles, and contacts.
            </p>
            <p className="mt-3 text-sm font-medium text-[#3EB489] lg:mt-4">
              Open →
            </p>
          </Link>
        ) : null}
        {showTasks || showTaskCreate ? (
          <Link
            href={showTasks ? '/admin/tasks/list' : '/admin/tasks/new'}
            className="rounded-xl border border-[#E5E7EB] bg-white p-4 transition active:bg-[#F9FAFB] lg:p-5 lg:hover:border-[#3EB489]"
          >
            <h3 className="text-base font-semibold text-[#1F2937]">Task</h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              {showTasks
                ? 'Search, filter, and manage all tasks.'
                : 'Create tasks with the access you were given.'}
            </p>
            <p className="mt-3 text-sm font-medium text-[#3EB489] lg:mt-4">
              Open →
            </p>
          </Link>
        ) : null}
        {can(admin, 'tasks', 'read') ? (
          <Link
            href="/admin/logs"
            className="rounded-xl border border-[#E5E7EB] bg-white p-4 transition active:bg-[#F9FAFB] lg:p-5 lg:hover:border-[#3EB489]"
          >
            <h3 className="text-base font-semibold text-[#1F2937]">Logs</h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              See member timer and task activity.
            </p>
            <p className="mt-3 text-sm font-medium text-[#3EB489] lg:mt-4">
              Open →
            </p>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      <DashboardHome />
    </AdminShell>
  );
}
