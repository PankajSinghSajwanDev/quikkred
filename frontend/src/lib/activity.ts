export const LOG_ACTIONS = [
  'timer_start',
  'timer_stop',
  'task_create',
  'task_update',
  'task_delete',
  'task_note',
] as const;

export type LogAction = (typeof LOG_ACTIONS)[number];

export type ActivityLogItem = {
  id: string;
  actorType: 'member' | 'admin';
  actorId: string;
  actorName: string;
  actorEmail?: string;
  action: LogAction;
  task?: string | null;
  taskTitle?: string;
  message: string;
  meta?: { durationMs?: number; etaMinutes?: number };
  createdAt?: string;
};

export function logActionLabel(action: string) {
  switch (action) {
    case 'timer_start':
      return 'Started time';
    case 'timer_stop':
      return 'Stopped time';
    case 'task_create':
      return 'Created task';
    case 'task_update':
      return 'Updated task';
    case 'task_delete':
      return 'Deleted task';
    case 'task_note':
      return 'Posted update';
    default:
      return action;
  }
}
