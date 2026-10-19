'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SearchField } from '@/components/SearchField';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { adminApi } from '@/lib/adminApi';
import {
  logActionLabel,
  type ActivityLogItem,
} from '@/lib/activity';
import { formatDuration, formatEtaMinutes } from '@/lib/task';

const PAGE_SIZE = 10;

type LogsResponse = {
  items: ActivityLogItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function ActivityLogs() {
  const [items, setItems] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (debouncedQuery.trim()) {
          params.set('q', debouncedQuery.trim());
        }
        const data = await adminApi<LogsResponse>(
          `/admin/logs?${params.toString()}`,
        );
        if (cancelled) return;
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(Math.max(1, data.totalPages || 1));
        if (data.page && data.page !== page) {
          setPage(data.page);
        }
        setError('');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load logs');
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page]);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="hidden lg:block">
        <h2 className="text-2xl font-semibold tracking-tight text-[#1F2937]">
          Activity logs
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Timer and task actions from the member portal
        </p>
      </div>
      <p className="text-sm text-[#6B7280] lg:hidden">
        {total} event{total === 1 ? '' : 's'}
      </p>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search member, task, or action"
          onClear={() => setQuery('')}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
        <div className="border-b border-[#E5E7EB] px-5 py-3.5">
          <h3 className="text-sm font-semibold text-[#1F2937]">All activity</h3>
          <p className="text-xs text-[#94A3B8]">
            {total === 0
              ? 'Showing 0'
              : `Showing ${from}–${to} of ${total} · page ${page}/${totalPages}`}
          </p>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="py-12 text-center text-sm text-[#6B7280]">Loading logs…</p>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#CBD5E0] bg-[#F7FAFC] px-4 py-14 text-center">
              <p className="text-sm font-semibold text-[#2D3748]">No logs yet</p>
              <p className="mt-1 text-sm text-[#718096]">
                Start/stop time and task changes from members will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#F4F7FB] text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Task</th>
                    <th className="px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-[#F3F4F6]">
                      <td className="whitespace-nowrap px-4 py-3.5 text-[#64748B]">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[#1F2937]">{item.actorName}</p>
                        <p className="text-xs text-[#94A3B8]">{item.actorEmail}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full bg-[#E8F8F1] px-2.5 py-1 text-[11px] font-semibold text-[#2f9a74]">
                          {logActionLabel(item.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[#4B5563]">
                        {item.task && item.taskTitle ? (
                          <Link
                            href={`/admin/tasks/${item.task}`}
                            className="hover:text-[#2f9a74]"
                          >
                            {item.taskTitle}
                          </Link>
                        ) : (
                          item.taskTitle || '—'
                        )}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-[#4B5563]">
                        {item.action === 'timer_stop' && item.meta?.durationMs
                          ? formatDuration(item.meta.durationMs)
                          : item.action === 'task_note' && item.meta?.etaMinutes
                            ? formatEtaMinutes(item.meta.etaMinutes)
                            : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {total > 0 ? (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E5E7EB] px-5 py-3.5 sm:flex-row">
            <p className="text-sm text-[#6B7280]">
              {from}–{to} of {total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-sm text-[#374151] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-sm text-[#374151] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
