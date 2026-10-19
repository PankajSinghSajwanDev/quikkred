'use client';

import Link from 'next/link';
import { IconPlay, IconStop } from '@/components/ActionIcons';
import { SelectField } from '@/components/form';
import { TaskUpdateForm } from '@/components/task/TaskUpdateForm';
import { TaskUpdateList } from '@/components/task/TaskUpdateList';
import {
  PRIORITY_STYLES,
  STATUS_STYLES,
  TASK_STATUSES,
  formatDuration,
  isTimerRunning,
  personName,
  statusLabel,
  taskElapsedMs,
  type TaskItem,
  type TaskStatus,
  type TaskUpdateItem,
} from '@/lib/task';

type Props = {
  task: TaskItem;
  updates: TaskUpdateItem[];
  now: number;
  backHref: string;
  backLabel?: string;
  canTrackTime: boolean;
  canPostUpdate: boolean;
  canChangeStatus?: boolean;
  busy?: boolean;
  updateTitle?: string;
  updateHint?: string;
  onTimer?: (action: 'start' | 'stop') => void;
  onStatusChange?: (status: TaskStatus) => Promise<void>;
  onPostUpdate?: (payload: { message: string }) => Promise<void>;
};

export function TaskDetail({
  task,
  updates,
  now,
  backHref,
  backLabel = 'Back to tasks',
  canTrackTime,
  canPostUpdate,
  canChangeStatus = false,
  busy = false,
  updateTitle,
  updateHint,
  onTimer,
  onStatusChange,
  onPostUpdate,
}: Props) {
  const running = isTimerRunning(task);
  const elapsed = formatDuration(taskElapsedMs(task, now));
  const showStart = Boolean(canTrackTime && onTimer);
  const startLabel = task.status === 'done' && !running ? 'Resume' : 'Start';

  return (
    <div className="mx-auto max-w-3xl space-y-4 lg:space-y-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4B5563] hover:text-[#2f9a74]"
      >
        <span aria-hidden>←</span>
        {backLabel}
      </Link>

      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] lg:p-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
            Full task
          </p>
          <h2 className="mt-1 break-words text-xl font-semibold tracking-tight text-[#111827] lg:text-2xl">
            {task.title}
          </h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#4B5563]">
            {task.description}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${PRIORITY_STYLES[task.priority]}`}
          >
            {task.priority}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS_STYLES[task.status]}`}
          >
            {statusLabel(task.status)}
          </span>
          {running ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-700 ring-1 ring-amber-200">
              Timer running
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Meta label="Assigned to" value={personName(task.assignedTo)} />
          <Meta
            label="Due"
            value={new Date(task.dueDate).toLocaleDateString()}
          />
          <Meta label="Time spent" value={elapsed || '0:00'} />
          {canChangeStatus && onStatusChange ? (
            <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5 ring-1 ring-[#EEF2F7]">
              <SelectField
                label="Status"
                value={task.status}
                onChange={(value) => {
                  if (busy) return;
                  void onStatusChange(value as TaskStatus);
                }}
                options={TASK_STATUSES.map((s) => ({
                  value: s,
                  label: statusLabel(s),
                }))}
              />
            </div>
          ) : (
            <Meta label="Status" value={statusLabel(task.status)} />
          )}
        </div>

        {showStart ? (
          <div className="mt-5 rounded-2xl border border-[#D7F0E6] bg-[#F3FBF7] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#111827]">
                  {running
                    ? 'Timer is running'
                    : task.status === 'done'
                      ? 'Resume this task'
                      : 'Start working on this task'}
                </p>
                <p className="mt-0.5 text-xs text-[#6B7280]">
                  {running
                    ? `Elapsed ${elapsed}. Stop when you pause or finish.`
                    : task.status === 'done'
                      ? 'Sets status to In Progress and starts the timer.'
                      : 'Track the time you spend. Admin can see the total.'}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => onTimer?.(running ? 'stop' : 'start')}
                className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border px-5 text-sm font-semibold shadow-sm transition disabled:opacity-60 ${
                  running
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-[#D7F0E6] bg-[#3EB489] text-white hover:bg-[#2f9a74]'
                }`}
              >
                {running ? <IconStop /> : <IconPlay />}
                {running ? `Stop · ${elapsed}` : startLabel}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {canPostUpdate && onPostUpdate ? (
        <TaskUpdateForm
          title={updateTitle}
          hint={updateHint}
          onSubmit={onPostUpdate}
        />
      ) : null}

      <TaskUpdateList updates={updates} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5 ring-1 ring-[#EEF2F7]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
        {label}
      </p>
      <p className="mt-1 break-words text-[13px] font-medium text-[#1E293B]">{value}</p>
    </div>
  );
}
