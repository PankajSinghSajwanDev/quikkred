'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminSession } from '@/components/AdminShell';
import { PremiumSelect } from '@/components/PremiumSelect';
import { adminApi } from '@/lib/adminApi';
import { can } from '@/lib/rbac';
import {
  PRIORITY_STYLES,
  STATUS_STYLES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  statusLabel,
  type TaskItem,
  type TaskPriority,
} from '@/lib/task';
import type { TeamMember } from '@/lib/team';

const PAGE_SIZE = 10;

type SortKey = 'due_asc' | 'due_desc' | 'newest' | 'priority';

function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17v3z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5l3 3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7h14M10 11v6M14 11v6M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M7 7l.8 12.2A1.5 1.5 0 009.3 20.5h5.4a1.5 1.5 0 001.5-1.3L17 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function assigneeName(task: TaskItem) {
  if (!task.assignedTo) return 'Unassigned';
  if (typeof task.assignedTo === 'string') return task.assignedTo;
  return task.assignedTo.name;
}

function assigneeId(task: TaskItem) {
  if (!task.assignedTo) return '';
  if (typeof task.assignedTo === 'string') return task.assignedTo;
  return task.assignedTo.id;
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function TaskList() {
  const router = useRouter();
  const admin = useAdminSession();
  const canCreate = can(admin, 'tasks', 'create');
  const canUpdate = can(admin, 'tasks', 'update');
  const canDelete = can(admin, 'tasks', 'delete');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = async () => {
    setLoading(true);
    try {
      const [taskData, memberData] = await Promise.all([
        adminApi<TaskItem[]>('/admin/tasks'),
        adminApi<TeamMember[]>('/admin/team').catch(() => [] as TeamMember[]),
      ]);
      setTasks(taskData);
      setMembers(memberData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...tasks];
    const q = debouncedQuery.toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const hay = [t.title, t.description, assigneeName(t)]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (statusFilter !== 'all') {
      list = list.filter((t) => t.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
      list = list.filter((t) => t.priority === priorityFilter);
    }
    if (assigneeFilter === 'unassigned') {
      list = list.filter((t) => !t.assignedTo);
    } else if (assigneeFilter !== 'all') {
      list = list.filter((t) => assigneeId(t) === assigneeFilter);
    }

    list.sort((a, b) => {
      if (sortBy === 'due_asc') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'due_desc') {
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      if (sortBy === 'priority') {
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      }
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

    return list;
  }, [
    tasks,
    debouncedQuery,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    sortBy,
  ]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter, priorityFilter, assigneeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const hasActiveFilters =
    Boolean(query) ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    assigneeFilter !== 'all' ||
    sortBy !== 'newest';

  const counts = { total: tasks.length };

  const clearFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setSortBy('newest');
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await adminApi(`/admin/tasks/${id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setSuccess('Task deleted');
      window.setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const pagination = (
    <div className="flex flex-col items-center justify-between gap-3 px-1 py-1 sm:flex-row">
      <p className="text-sm text-[#6B7280]">
        {pageItems.length} of {filtered.length} · page {safePage}/{totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-sm text-[#374151] disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-sm text-[#374151] disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 lg:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="hidden lg:block">
          <h2 className="text-2xl font-semibold tracking-tight text-[#111827]">
            Tasks
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            {counts.total} total
            {hasActiveFilters ? ` · ${filtered.length} matching` : ''}
          </p>
        </div>
        <p className="text-sm text-[#6B7280] lg:hidden">
          {counts.total} total
          {hasActiveFilters ? ` · ${filtered.length} match` : ''}
        </p>
        {canCreate ? (
          <Link
            href="/admin/tasks/new"
            className="rounded-xl bg-[#3EB489] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f9a74] lg:px-4 lg:py-2.5"
          >
            Create task
          </Link>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {/* Filters */}
      <section className="rounded-2xl border border-[#E5E7EB] bg-white px-3.5 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-5 sm:py-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3.5 py-2.5 transition focus-within:border-[#3EB489] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#3EB489]/15">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="shrink-0 text-[#9CA3AF]"
            >
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M16.2 16.2L20 20"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              autoComplete="off"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF]"
            />
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 text-xs font-medium text-[#6B7280] hover:text-[#3EB489]"
              >
                Reset
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <PremiumSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All statuses' },
                ...TASK_STATUSES.map((s) => ({
                  value: s,
                  label: statusLabel(s),
                })),
              ]}
            />
            <PremiumSelect
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                { value: 'all', label: 'All priorities' },
                ...TASK_PRIORITIES.map((p) => ({
                  value: p,
                  label: p.charAt(0).toUpperCase() + p.slice(1),
                })),
              ]}
            />
            <PremiumSelect
              searchable
              searchPlaceholder="Search name or email…"
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              options={[
                { value: 'all', label: 'Everyone' },
                { value: 'unassigned', label: 'Unassigned' },
                ...members.map((m) => ({
                  value: m.id,
                  label: m.name,
                  searchText: m.email,
                })),
              ]}
            />
            <PremiumSelect
              value={sortBy}
              onChange={(v) => setSortBy(v as SortKey)}
              options={[
                { value: 'newest', label: 'Newest first' },
                { value: 'due_asc', label: 'Due date ↑' },
                { value: 'due_desc', label: 'Due date ↓' },
                { value: 'priority', label: 'Priority' },
              ]}
            />
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl bg-white px-5 py-16 text-center text-sm text-[#6B7280] ring-1 ring-[#E5E7EB]">
          Loading tasks…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white px-5 py-16 text-center ring-1 ring-[#E5E7EB]">
          <p className="text-sm font-medium text-[#111827]">No tasks found</p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Try adjusting filters or create a new task.
          </p>
        </div>
      ) : (
        <>
          {/* Phone: card view — no horizontal scroll */}
          <div className="space-y-5 lg:hidden">
            {pageItems.map((task) => {
              const priorityBar =
                task.priority === 'high'
                  ? 'bg-rose-500'
                  : task.priority === 'medium'
                    ? 'bg-amber-500'
                    : 'bg-sky-500';
              return (
                <article
                  key={task.id}
                  className="relative w-full max-w-full overflow-hidden rounded-[1.25rem] border border-white bg-white shadow-[0_8px_28px_rgba(15,23,42,0.08)] ring-1 ring-[#E2E8F0]/80"
                >
                  <div
                    className={`absolute inset-y-0 left-0 w-[3px] ${priorityBar}`}
                    aria-hidden
                  />
                  <div className="px-4 pb-4 pt-4">
                    <div className="flex items-start gap-2.5">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/tasks/${task.id}`}
                          className="block break-words text-[15px] font-semibold leading-snug tracking-tight text-[#0F172A]"
                        >
                          {task.title}
                        </Link>
                      </div>
                      {canUpdate || canDelete ? (
                        <div className="flex shrink-0 gap-1.5">
                          {canUpdate ? (
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/admin/tasks/new?edit=${task.id}`)
                              }
                              aria-label={`Edit ${task.title}`}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D7F0E6] bg-white text-[#2f9a74] shadow-[0_2px_8px_rgba(47,154,116,0.15)] transition active:scale-95"
                            >
                              <IconEdit />
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => void onDelete(task.id)}
                              aria-label={`Delete ${task.title}`}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-500 shadow-[0_2px_8px_rgba(244,63,94,0.12)] transition active:scale-95"
                            >
                              <IconTrash />
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {task.description ? (
                      <Link
                        href={`/admin/tasks/${task.id}`}
                        className="mt-2 block break-words text-xs leading-relaxed text-[#64748B]"
                      >
                        {task.description}
                      </Link>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${PRIORITY_STYLES[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[task.status]}`}
                      >
                        {statusLabel(task.status)}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5 ring-1 ring-[#EEF2F7]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                          Due date
                        </p>
                        <p className="mt-1 text-[13px] font-medium text-[#1E293B]">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5 ring-1 ring-[#EEF2F7]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                          Assignee
                        </p>
                        <p className="mt-1 break-words text-[13px] font-medium text-[#1E293B]">
                          {assigneeName(task)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            {pagination}
          </div>

          {/* Desktop: list / table only */}
          <section className="hidden overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#F3F4F6] text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                    <th className="px-5 py-3 font-medium">Task</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 font-medium">Assignee</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    {canUpdate || canDelete ? (
                      <th className="px-5 py-3 text-right font-medium"> </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-[#F3F4F6] last:border-0 transition hover:bg-[#FAFAFA]"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/tasks/${task.id}`}
                          className="block max-w-[280px]"
                        >
                          <p className="truncate font-medium text-[#111827] hover:text-[#2f9a74]">
                            {task.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[#9CA3AF]">
                            {task.description}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-[#4B5563]">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-[#6B7280]">
                        {assigneeName(task)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${PRIORITY_STYLES[task.priority]}`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[task.status]}`}
                        >
                          {statusLabel(task.status)}
                        </span>
                      </td>
                      {canUpdate || canDelete ? (
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            {canUpdate ? (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/admin/tasks/new?edit=${task.id}`)
                                }
                                aria-label={`Edit ${task.title}`}
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D7F0E6] bg-[#E8F8F1] text-[#2f9a74] shadow-sm transition hover:bg-[#D7F3E8] active:scale-95"
                              >
                                <IconEdit />
                              </button>
                            ) : null}
                            {canDelete ? (
                              <button
                                type="button"
                                onClick={() => void onDelete(task.id)}
                                aria-label={`Delete ${task.title}`}
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 shadow-sm transition hover:bg-rose-100 active:scale-95"
                              >
                                <IconTrash />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[#F3F4F6] px-5 py-3.5">
              {pagination}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
