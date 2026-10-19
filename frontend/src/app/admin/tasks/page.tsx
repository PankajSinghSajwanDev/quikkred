'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell, useAdminSession } from '@/components/AdminShell';
import { can, canAccessList } from '@/lib/rbac';

function TasksIndexRedirect() {
  const router = useRouter();
  const admin = useAdminSession();

  useEffect(() => {
    if (canAccessList(admin, 'tasks')) {
      router.replace('/admin/tasks/list');
      return;
    }
    if (can(admin, 'tasks', 'create') || can(admin, 'tasks', 'update')) {
      router.replace('/admin/tasks/new');
      return;
    }
    router.replace('/admin');
  }, [admin, router]);

  return (
    <div className="py-12 text-center text-sm text-[#6B7280]">Opening tasks…</div>
  );
}

export default function AdminTasksIndexPage() {
  return (
    <AdminShell>
      <TasksIndexRedirect />
    </AdminShell>
  );
}
