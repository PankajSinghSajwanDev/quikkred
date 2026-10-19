import type { TeamMember } from './team';

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: TeamMember | string | null;
  createdBy?: TeamMember | string | null;
  timerStartedAt?: string | null;
  timeSpentMs?: number;
  etaMinutes?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TaskUpdateItem = {
  id: string;
  task: string;
  actorType: 'member' | 'admin';
  actorId: string;
  actorName: string;
  actorEmail?: string;
  message: string;
  etaMinutes?: number | null;
  createdAt?: string;
};

export type EtaUnit = 'minutes' | 'hours' | 'days';

type TaskPerson = TeamMember | string | null | undefined;

export function personName(value: TaskPerson, fallback = 'Unassigned') {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.name || fallback;
}

export function personId(value: TaskPerson) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.id;
}

/** Assignee or creator can start/stop the timer on a task. */
export function canTrackTaskTime(task: TaskItem, userId: string) {
  if (!userId) return false;
  return (
    personId(task.assignedTo) === userId || personId(task.createdBy) === userId
  );
}

export function taskElapsedMs(task: Pick<TaskItem, 'timerStartedAt' | 'timeSpentMs'>, now = Date.now()) {
  const base = Number(task.timeSpentMs) || 0;
  if (!task.timerStartedAt) return base;
  const started = new Date(task.timerStartedAt).getTime();
  if (Number.isNaN(started)) return base;
  return base + Math.max(0, now - started);
}

export function formatDuration(ms: number) {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isTimerRunning(task: Pick<TaskItem, 'timerStartedAt'>) {
  return Boolean(task.timerStartedAt);
}

export function etaToMinutes(amount: string, unit: EtaUnit) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unit === 'hours') return Math.round(n * 60);
  if (unit === 'days') return Math.round(n * 1440);
  return Math.round(n);
}

export function formatEtaMinutes(minutes?: number | null) {
  if (minutes == null || minutes <= 0) return '';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins && !days) parts.push(`${mins}m`);
  return parts.join(' ') || '0m';
}

export function statusLabel(status: string) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-[#ECFDF5] text-[#047857]',
  medium: 'bg-[#FFF7ED] text-[#C2410C]',
  high: 'bg-[#FEF2F2] text-[#B91C1C]',
};

export const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: 'bg-[#EEF2FF] text-[#4338CA]',
  in_progress: 'bg-[#EFF6FF] text-[#1D4ED8]',
  done: 'bg-[#ECFDF5] text-[#047857]',
};
