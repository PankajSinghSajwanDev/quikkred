'use client';

import { Suspense } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { TaskManager } from '@/components/TaskManager';

export default function AdminCreateTaskPage() {
  return (
    <AdminShell>
      <Suspense
        fallback={
          <div className="text-sm text-[#718096]">Loading task form…</div>
        }
      >
        <TaskManager />
      </Suspense>
    </AdminShell>
  );
}
