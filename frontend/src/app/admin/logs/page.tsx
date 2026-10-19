'use client';

import { ActivityLogs } from '@/components/ActivityLogs';
import { AdminShell } from '@/components/AdminShell';

export default function AdminLogsPage() {
  return (
    <AdminShell>
      <ActivityLogs />
    </AdminShell>
  );
}
