'use client';

import { UserShell } from '@/components/UserShell';
import { UserTaskDetail } from '@/components/UserTaskDetail';

export default function UserTaskDetailPage() {
  return (
    <UserShell>
      <UserTaskDetail />
    </UserShell>
  );
}
