'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TaskDetail } from '@/components/task/TaskDetail';
import { useUserSession } from '@/components/UserShell';
import { memberCan, memberSeesAllTasks } from '@/lib/rbac';
import {
  canTrackTaskTime,
  isTimerRunning,
  personId,
  type TaskItem,
  type TaskStatus,
  type TaskUpdateItem,
} from '@/lib/task';
import { userApi } from '@/lib/userApi';

export function UserTaskDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const me = useUserSession();
  const id = String(params.id || '');
  const [task, setTask] = useState<TaskItem | null>(null);
  const [updates, setUpdates] = useState<TaskUpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = async () => {
    setLoading(true);
    try {
      const [taskData, updateData] = await Promise.all([
        userApi<TaskItem>(`/user/tasks/${id}`),
        userApi<TaskUpdateItem[]>(`/user/tasks/${id}/updates`),
      ]);
      setTask(taskData);
      setUpdates(updateData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task');
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    void load();
  }, [id]);

  const running = Boolean(task && isTimerRunning(task));
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const own =
    Boolean(task) &&
    (personId(task?.assignedTo) === me.id || personId(task?.createdBy) === me.id);
  const canPost =
    Boolean(task) && (own || memberCan(me.permissions, 'tasks', 'update'));
  const canChangeStatus =
    Boolean(task) && (own || memberCan(me.permissions, 'tasks', 'update'));
  const canView =
    Boolean(task) && (own || memberSeesAllTasks(me.permissions));

  const onTimer = async (action: 'start' | 'stop') => {
    if (!task) return;
    setBusy(true);
    setError('');
    try {
      const updated = await userApi<TaskItem>(`/user/tasks/${task.id}/timer`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setTask(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Timer update failed');
    } finally {
      setBusy(false);
    }
  };

  const onStatusChange = async (status: TaskStatus) => {
    if (!task || status === task.status) return;
    setBusy(true);
    setError('');
    try {
      const updated = await userApi<TaskItem>(`/user/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setTask(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setBusy(false);
    }
  };

  const onPostUpdate = async (payload: { message: string }) => {
    const result = await userApi<{ update: TaskUpdateItem; task: TaskItem }>(
      `/user/tasks/${id}/updates`,
      { method: 'POST', body: JSON.stringify({ message: payload.message }) },
    );
    setTask(result.task);
    setUpdates((prev) => [result.update, ...prev]);
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-[#6B7280]">Loading task…</p>;
  }

  if (!task || !canView) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#E5E7EB] bg-white px-5 py-14 text-center">
        <p className="text-sm font-semibold text-[#111827]">
          {error || 'Task not found'}
        </p>
        <button
          type="button"
          onClick={() => router.push('/user/tasks')}
          className="mt-4 text-sm font-medium text-[#2f9a74]"
        >
          Back to tasks
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <TaskDetail
        task={task}
        updates={updates}
        now={now}
        backHref="/user/tasks"
        canTrackTime={
          canTrackTaskTime(task, me.id) ||
          memberCan(me.permissions, 'tasks', 'update')
        }
        canPostUpdate={canPost}
        canChangeStatus={canChangeStatus}
        busy={busy}
        onTimer={(action) => void onTimer(action)}
        onStatusChange={onStatusChange}
        onPostUpdate={onPostUpdate}
      />
    </div>
  );
}
