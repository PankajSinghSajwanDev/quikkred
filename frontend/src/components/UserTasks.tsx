'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  SelectField,
  TextAreaField,
  TextField,
  useFormErrors,
} from '@/components/form';
import { MyAccessCard } from '@/components/MyAccessCard';
import { TaskActionButtons } from '@/components/TaskActionButtons';
import { useUserSession } from '@/components/UserShell';
import { hasGrant, memberCan, memberSeesAllTasks } from '@/lib/rbac';
import { userApi } from '@/lib/userApi';
import {
  description as descriptionRule,
  dueDate as dueDateRule,
  taskErrors,
  title as titleRule,
} from '@/lib/validation';
import {
  PRIORITY_STYLES,
  STATUS_STYLES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  canTrackTaskTime,
  isTimerRunning,
  statusLabel,
  type TaskItem,
  type TaskPriority,
  type TaskStatus,
} from '@/lib/task';
import type { TeamMember } from '@/lib/team';
import { roleLabel } from '@/lib/team';

type FormState = {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string;
};

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  dueDate: new Date().toISOString().slice(0, 10),
  priority: 'medium',
  status: 'todo',
  assignedTo: '',
});

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

export function UserTasks() {
  const me = useUserSession();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const meId = me.id;
  // Create/edit/delete require explicit admin grants (not default self-service).
  const canCreate = hasGrant(me.permissions, 'tasks', 'create');
  const canEdit = hasGrant(me.permissions, 'tasks', 'update');
  const canDelete = hasGrant(me.permissions, 'tasks', 'delete');
  const seesAll = memberSeesAllTasks(me.permissions);
  const canTrack = (task: TaskItem) =>
    canTrackTaskTime(task, meId) || memberCan(me.permissions, 'tasks', 'update');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [form, setForm] = useState<FormState>(emptyForm);
  const { errors, clearField, clearAll, run, applyApiError, setFieldError } =
    useFormErrors();

  const anyRunning = tasks.some((task) => isTimerRunning(task));
  useEffect(() => {
    if (!anyRunning) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [anyRunning]);

  const load = async () => {
    setLoading(true);
    try {
      const [taskData, memberData] = await Promise.all([
        userApi<TaskItem[]>('/user/tasks'),
        userApi<TeamMember[]>('/user/team'),
      ]);
      setTasks(taskData);
      setMembers(memberData);
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

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.id,
        label: `${m.name} · ${roleLabel(m.role)}`,
        searchText: m.email,
      })),
    [members],
  );

  const openCreate = () => {
    if (!canCreate) return;
    setEditingId(null);
    setForm({ ...emptyForm(), assignedTo: meId });
    setFormOpen(true);
    setSuccess('');
    setError('');
    clearAll();
  };

  const openEdit = (task: TaskItem) => {
    if (!canEdit) return;
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      dueDate: new Date(task.dueDate).toISOString().slice(0, 10),
      priority: task.priority,
      status: task.status,
      assignedTo: assigneeId(task) || meId,
    });
    setFormOpen(true);
    setSuccess('');
    setError('');
    clearAll();
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    clearAll();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!run(taskErrors(form, true))) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        dueDate: form.dueDate,
        priority: form.priority,
        status: form.status,
        assignedTo: form.assignedTo || null,
      };

      if (editingId) {
        await userApi(`/user/tasks/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccess(
          form.assignedTo && form.assignedTo !== meId
            ? 'Task updated · assignee notified'
            : 'Task updated',
        );
      } else {
        await userApi('/user/tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccess(
          form.assignedTo && form.assignedTo !== meId
            ? 'Task created · teammate notified'
            : 'Task created',
        );
      }
      closeForm();
      await load();
      window.setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      if (!applyApiError(err)) {
        setError(err instanceof Error ? err.message : 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (task: TaskItem) => {
    if (!confirm(`Delete “${task.title}”?`)) return;
    setError('');
    setBusyId(task.id);
    try {
      await userApi(`/user/tasks/${task.id}`, { method: 'DELETE' });
      setSuccess('Task deleted');
      await load();
      window.setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const onTimer = async (task: TaskItem, action: 'start' | 'stop') => {
    setError('');
    setBusyId(task.id);
    try {
      const updated = await userApi<TaskItem>(`/user/tasks/${task.id}/timer`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setTasks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess(action === 'start' ? 'Timer started' : 'Timer stopped');
      window.setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Timer update failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 lg:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="hidden lg:block">
          <h2 className="text-2xl font-semibold tracking-tight text-[#111827]">
            {seesAll ? 'Tasks' : 'My tasks'}
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            {seesAll
              ? 'All workspace tasks you have permission to view'
              : 'Tasks assigned to you or created by you'}
          </p>
        </div>
        <p className="text-sm text-[#6B7280] lg:hidden">
          {tasks.length} task{tasks.length === 1 ? '' : 's'}
        </p>
        {canCreate ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-[#3EB489] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f9a74] lg:px-4 lg:py-2.5"
          >
            + Create & assign
          </button>
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

      <MyAccessCard permissions={me.permissions} />

      {formOpen && (canCreate || canEdit) ? (
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] lg:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#111827] lg:text-lg">
                {editingId ? 'Edit task' : 'New task'}
              </h3>
              <p className="mt-1 text-sm text-[#6B7280]">
                Assign to any teammate — they get a notification.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#4B5563]"
            >
              Close
            </button>
          </div>

          <form
            noValidate
            onSubmit={(e) => void onSubmit(e)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <TextField
              label="Title"
              className="sm:col-span-2"
              value={form.title}
              error={errors.title}
              placeholder="Task title"
              maxLength={150}
              onChange={(title) => {
                setForm({ ...form, title });
                clearField('title');
              }}
              onBlur={(title) => setFieldError('title', titleRule(title))}
            />
            <TextAreaField
              label="Description"
              className="sm:col-span-2"
              value={form.description}
              error={errors.description}
              rows={3}
              maxLength={2000}
              placeholder="What needs to be done?"
              onChange={(description) => {
                setForm({ ...form, description });
                clearField('description');
              }}
              onBlur={(description) =>
                setFieldError('description', descriptionRule(description))
              }
            />
            <TextField
              label="Due date"
              type="date"
              value={form.dueDate}
              error={errors.dueDate}
              onChange={(dueDate) => {
                setForm({ ...form, dueDate });
                clearField('dueDate');
              }}
              onBlur={(dueDate) => setFieldError('dueDate', dueDateRule(dueDate))}
            />
            <SelectField
              label="Assign to"
              searchable
              searchPlaceholder="Search name or email…"
              value={form.assignedTo}
              error={errors.assignedTo}
              placeholder="Select teammate"
              onChange={(v) => {
                setForm({ ...form, assignedTo: v });
                clearField('assignedTo');
              }}
              options={[
                { value: '', label: 'Select teammate' },
                ...memberOptions,
              ]}
            />
            <SelectField
              label="Priority"
              value={form.priority}
              error={errors.priority}
              onChange={(v) => {
                setForm({ ...form, priority: v as TaskPriority });
                clearField('priority');
              }}
              options={TASK_PRIORITIES.map((p) => ({
                value: p,
                label: p.charAt(0).toUpperCase() + p.slice(1),
              }))}
            />
            <SelectField
              label="Status"
              value={form.status}
              error={errors.status}
              onChange={(v) => {
                setForm({ ...form, status: v as TaskStatus });
                clearField('status');
              }}
              options={TASK_STATUSES.map((s) => ({
                value: s,
                label: statusLabel(s),
              }))}
            />
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="brand-btn w-auto min-w-[160px] px-7"
              >
                {saving
                  ? 'Saving…'
                  : editingId
                    ? 'Save changes'
                    : 'Create task'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {loading ? (
        <p className="py-12 text-center text-sm text-[#6B7280]">Loading…</p>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CBD5E0] bg-white px-4 py-14 text-center">
          <p className="text-sm font-semibold text-[#2D3748]">No tasks yet</p>
          <p className="mt-1 text-sm text-[#718096]">
            {canCreate
              ? 'Create a task and assign it to a teammate.'
              : seesAll
                ? 'No tasks in the workspace yet.'
                : 'No tasks are assigned to you yet.'}
          </p>
          {canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 rounded-full bg-[#3EB489] px-5 py-2.5 text-sm font-semibold text-white"
            >
              + Create & assign
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Phone cards */}
          <div className="space-y-5 lg:hidden">
            {tasks.map((task) => (
              <article
                key={task.id}
                className="relative overflow-hidden rounded-[1.25rem] border border-white bg-white shadow-[0_8px_28px_rgba(15,23,42,0.08)] ring-1 ring-[#E2E8F0]/80"
              >
                <div className="absolute inset-y-0 left-0 w-[3px] bg-[#3EB489]" />
                <div className="px-4 py-4">
                  <Link
                    href={`/user/tasks/${task.id}`}
                    className="block rounded-xl outline-none transition hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#3EB489]/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="break-words text-[15px] font-semibold text-[#0F172A]">
                        {task.title}
                      </p>
                    </div>
                    <p className="mt-1.5 break-words text-xs text-[#64748B]">
                      {task.description}
                    </p>
                  </Link>
                  <div className="mt-3 flex flex-wrap gap-1.5">
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
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5 ring-1 ring-[#EEF2F7]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                        Assigned to
                      </p>
                      <p className="mt-1 break-words text-[13px] font-medium text-[#1E293B]">
                        {assigneeName(task)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5 ring-1 ring-[#EEF2F7]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                        Due
                      </p>
                      <p className="mt-1 text-[13px] font-medium text-[#1E293B]">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5 ring-1 ring-[#EEF2F7]">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                        Actions
                      </p>
                      <TaskActionButtons
                        task={task}
                        now={now}
                        canDelete={canDelete}
                        canEdit={canEdit}
                        canTrackTime={canTrack(task)}
                        busy={busyId === task.id}
                        onEdit={openEdit}
                        onDelete={(item) => void onDelete(item)}
                        onTimer={(item, action) => void onTimer(item, action)}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop table */}
          <section className="hidden overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white lg:block">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#F3F4F6] text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                  <th className="px-5 py-3">Task</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/user/tasks/${task.id}`}
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
                      {assigneeName(task)}
                    </td>
                    <td className="px-4 py-4 text-[#4B5563]">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${PRIORITY_STYLES[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[task.status]}`}
                      >
                        {statusLabel(task.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <TaskActionButtons
                        task={task}
                        now={now}
                        canDelete={canDelete}
                        canEdit={canEdit}
                        canTrackTime={canTrack(task)}
                        busy={busyId === task.id}
                        onEdit={openEdit}
                        onDelete={(item) => void onDelete(item)}
                        onTimer={(item, action) => void onTimer(item, action)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
