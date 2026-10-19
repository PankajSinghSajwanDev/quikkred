'use client';

import { AdminShell } from '@/components/AdminShell';
import { TaskList } from '@/components/TaskList';

export default function AdminTaskListPage() {
  return (
    <AdminShell>
      <TaskList />
    </AdminShell>
  );
}
