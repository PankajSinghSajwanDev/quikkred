'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserShell } from '@/components/UserShell';
import { userApi } from '@/lib/userApi';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt?: string;
  task?: { id?: string; title?: string; status?: string } | null;
};

export default function UserNotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await userApi<NotificationItem[]>('/user/notifications');
      setItems(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Live: refresh list when a new notification is pushed
  useEffect(() => {
    const onChanged = () => {
      void load();
    };
    window.addEventListener('notifications:changed', onChanged);
    return () => window.removeEventListener('notifications:changed', onChanged);
  }, []);

  const markRead = async (id: string) => {
    try {
      await userApi(`/user/notifications/${id}/read`, { method: 'PATCH' });
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    try {
      await userApi('/user/notifications/read-all', { method: 'POST' });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    } catch {
      /* ignore */
    }
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <UserShell>
      <div className="mx-auto max-w-5xl space-y-4 lg:space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="hidden lg:block">
            <h2 className="text-2xl font-semibold tracking-tight text-[#111827]">
              Notifications
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Alerts when a task is assigned to you
            </p>
          </div>
          <p className="text-sm text-[#6B7280] lg:hidden">
            {unread} unread
          </p>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => void markAll()}
              className="rounded-xl border border-[#D7F0E6] bg-[#E8F8F1] px-3.5 py-2 text-sm font-semibold text-[#2f9a74]"
            >
              Mark all read
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="py-12 text-center text-sm text-[#6B7280]">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#CBD5E0] bg-white px-4 py-14 text-center">
            <p className="text-sm font-semibold text-[#2D3748]">
              No notifications yet
            </p>
            <p className="mt-1 text-sm text-[#718096]">
              When someone assigns you a task, it will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 lg:space-y-2">
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.read) void markRead(n.id);
                  if (n.task?.id) router.push(`/user/tasks/${n.task.id}`);
                }}
                className={`w-full rounded-2xl border px-4 py-3.5 text-left transition lg:rounded-xl ${
                  n.read
                    ? 'border-[#E5E7EB] bg-white'
                    : 'border-[#D7F0E6] bg-[#F0FDF8] shadow-[0_4px_16px_rgba(62,180,137,0.08)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {n.title}
                    </p>
                    <p className="mt-1 break-words text-sm text-[#475569]">
                      {n.message}
                    </p>
                    {n.createdAt ? (
                      <p className="mt-2 text-xs text-[#94A3B8]">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  {!n.read ? (
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#3EB489]" />
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </UserShell>
  );
}
