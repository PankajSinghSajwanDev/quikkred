'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TaskDetail } from '@/components/task/TaskDetail';
import { adminApi } from '@/lib/adminApi';
import { isTimerRunning, type TaskItem, type TaskUpdateItem } from '@/lib/task';

export function AdminTaskDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params.id || '');
  const [task, setTask] = useState<TaskItem | null>(null);
  const [updates, setUpdates] = useState<TaskUpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const load = async () => {
    setLoading(true);
    try {
      const [taskData, updateData] = await Promise.all([
        adminApi<TaskItem>(`/admin/tasks/${id}`),
        adminApi<TaskUpdateItem[]>(`/admin/tasks/${id}/updates`),
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

  const onPostUpdate = async (payload: { message: string }) => {
    const result = await adminApi<{ update: TaskUpdateItem; task: TaskItem }>(
      `/admin/tasks/${id}/updates`,
      { method: 'POST', body: JSON.stringify({ message: payload.message }) },
    );
    setTask(result.task);
    setUpdates((prev) => [result.update, ...prev]);
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-[#6B7280]">Loading task…</p>;
  }

  if (!task) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#E5E7EB] bg-white px-5 py-14 text-center">
        <p className="text-sm font-semibold text-[#111827]">
          {error || 'Task not found'}
        </p>
        <button
          type="button"
          onClick={() => router.push('/admin/tasks/list')}
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
        backHref="/admin/tasks/list"
        canTrackTime={false}
        canPostUpdate
        updateTitle="Reply to member"
        updateHint="Members see this on the task. Use it for guidance or blockers."
        onPostUpdate={onPostUpdate}
      />
    </div>
  );
}
