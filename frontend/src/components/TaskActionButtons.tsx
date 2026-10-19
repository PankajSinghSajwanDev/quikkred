'use client';

import { IconPlay, IconStop, IconTrash } from '@/components/ActionIcons';
import {
  formatDuration,
  isTimerRunning,
  taskElapsedMs,
  type TaskItem,
} from '@/lib/task';

type Props = {
  task: TaskItem;
  now: number;
  canDelete: boolean;
  canEdit?: boolean;
  canTrackTime: boolean;
  busy?: boolean;
  onEdit?: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
  onTimer: (task: TaskItem, action: 'start' | 'stop') => void;
};

export function TaskActionButtons({
  task,
  now,
  canDelete,
  canEdit = false,
  canTrackTime,
  busy = false,
  onEdit,
  onDelete,
  onTimer,
}: Props) {
  const running = isTimerRunning(task);
  const elapsed = formatDuration(taskElapsedMs(task, now));

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {canTrackTime ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onTimer(task, running ? 'stop' : 'start')}
          aria-label={
            running
              ? `Stop time (${elapsed})`
              : task.status === 'done'
                ? 'Resume time'
                : 'Start time'
          }
          title={
            running
              ? `Stop time · ${elapsed}`
              : task.status === 'done'
                ? 'Resume time'
                : 'Start time'
          }
          className={`inline-flex h-9 items-center gap-1 rounded-xl border px-2.5 text-xs font-semibold shadow-sm transition disabled:opacity-60 ${
            running
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-[#D7F0E6] bg-[#E8F8F1] text-[#2f9a74]'
          }`}
        >
          {running ? <IconStop /> : <IconPlay />}
          {running ? elapsed : task.status === 'done' ? 'Resume' : 'Start'}
        </button>
      ) : null}
      {canEdit && onEdit ? (
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="rounded-xl border border-[#D7F0E6] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2f9a74]"
        >
          Edit
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(task)}
          aria-label={`Delete ${task.title}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 shadow-sm disabled:opacity-60"
        >
          <IconTrash />
        </button>
      ) : null}
    </div>
  );
}
