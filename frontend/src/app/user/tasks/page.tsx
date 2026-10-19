'use client';

import { UserShell } from '@/components/UserShell';
import { UserTasks } from '@/components/UserTasks';

export default function UserTasksPage() {
  return (
    <UserShell>
      <UserTasks />
    </UserShell>
  );
}
