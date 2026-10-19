'use client';

import { AdminShell } from '@/components/AdminShell';
import { TeamManager } from '@/components/TeamManager';

export default function AdminTeamPage() {
  return (
    <AdminShell>
      <TeamManager />
    </AdminShell>
  );
}
