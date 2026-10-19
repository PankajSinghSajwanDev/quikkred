'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminSession } from '@/components/AdminShell';
import {
  SelectField,
  TextAreaField,
  TextField,
  useFormErrors,
} from '@/components/form';
import { adminApi } from '@/lib/adminApi';
import { can, canAccessList } from '@/lib/rbac';
import {
  description as descriptionRule,
  dueDate as dueDateRule,
  taskErrors,
  title as titleRule,
} from '@/lib/validation';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  statusLabel,
  type TaskItem,
  type TaskPriority,
  type TaskStatus,
} from '@/lib/task';
import type { TeamMember } from '@/lib/team';

type FormState = {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string;
};

const emptyForm: FormState = {
  title: '',
  description: '',
  dueDate: '',
  priority: 'medium',
  status: 'todo',
  assignedTo: '',
};

export function TaskManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const admin = useAdminSession();
  const canCreate = can(admin, 'tasks', 'create');
  const canUpdate = can(admin, 'tasks', 'update');

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { errors, clearField, clearAll, run, applyApiError, setFieldError } =
    useFormErrors();

  useEffect(() => {
    void adminApi<TeamMember[]>('/admin/team')
      .then(setMembers)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (editId && !canUpdate) {
      router.replace(canCreate ? '/admin/tasks/new' : '/admin/tasks/list');
      return;
    }
    if (!editId && !canCreate) {
      router.replace('/admin/tasks/list');
    }
  }, [editId, canCreate, canUpdate, router]);

  useEffect(() => {
    if (!editId || !canUpdate) return;

    void adminApi<TaskItem>(`/admin/tasks/${editId}`)
      .then((task) => {
        if (!task) {
          setError('Task not found');
          return;
        }
        setEditingId(task.id);
        setForm({
          title: task.title,
          description: task.description,
          dueDate: task.dueDate
            ? new Date(task.dueDate).toISOString().slice(0, 10)
            : '',
          priority: task.priority,
          status: task.status,
          assignedTo:
            typeof task.assignedTo === 'object' && task.assignedTo
              ? task.assignedTo.id
              : typeof task.assignedTo === 'string'
                ? task.assignedTo
                : '',
        });
        setSuccess('');
        setError('');
        clearAll();
      })
      .catch((err: Error) => setError(err.message));
  }, [editId, canUpdate]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    clearAll();
    router.replace('/admin/tasks/new');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!run(taskErrors(form))) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        dueDate: new Date(form.dueDate).toISOString(),
        priority: form.priority,
        status: form.status,
        assignedTo: form.assignedTo || null,
      };

      if (editingId) {
        await adminApi(`/admin/tasks/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccess('Task updated');
        setTimeout(() => router.push('/admin/tasks/list'), 600);
      } else {
        await adminApi('/admin/tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccess('Task created');
        setForm(emptyForm);
        clearAll();
      }
    } catch (err) {
      if (!applyApiError(err)) {
        setError(err instanceof Error ? err.message : 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 lg:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 lg:items-end">
        <div className="hidden lg:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3EB489]">
            Task module
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[#2D3748]">
            {editingId ? 'Edit task' : 'Create task'}
          </h2>
          <p className="mt-1 text-sm text-[#718096]">
            Fill details here. Browse everything on the Task list page.
          </p>
        </div>
        <p className="text-sm text-[#6B7280] lg:hidden">
          {editingId ? 'Update task details' : 'Add a new task'}
        </p>
        {canAccessList(admin, 'tasks') ? (
          <Link
            href="/admin/tasks/list"
            className="rounded-xl border border-[#DCE6F8] bg-[#EEF4FF] px-3.5 py-2 text-sm font-semibold text-[#3B6FE0] hover:bg-[#E0EBFF] lg:px-4 lg:py-2.5"
          >
            Open list →
          </Link>
        ) : null}
      </div>

      <section className="relative min-h-[32rem] overflow-visible rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_12px_32px_rgba(45,55,72,0.05)] sm:p-7 lg:min-h-[36rem] lg:rounded-[1.75rem] lg:p-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
          <div>
            <h3 className="text-xl font-semibold text-[#2D3748]">
              {editingId ? 'Update details' : 'New task'}
            </h3>
            <p className="mt-1.5 text-sm text-[#718096]">
              Title, description, due date, priority, status, and assignee.
            </p>
          </div>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#2D3748] hover:bg-[#F7FAFC]"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-[#718096]">Loading…</p>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mb-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
            {success}
          </p>
        ) : null}

        <form
          noValidate
          onSubmit={(e) => void onSubmit(e)}
          className="grid gap-6 sm:grid-cols-2 lg:gap-7"
        >
          <TextField
            label="Title"
            value={form.title}
            error={errors.title}
            placeholder="Build login page"
            maxLength={150}
            onChange={(title) => {
              setForm({ ...form, title });
              clearField('title');
            }}
            onBlur={(title) => setFieldError('title', titleRule(title))}
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
          <TextAreaField
            label="Description"
            className="sm:col-span-2"
            value={form.description}
            error={errors.description}
            rows={5}
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
          <SelectField
            label="Assign to member"
            className="sm:col-span-2"
            searchable
            searchPlaceholder="Search name or email…"
            value={form.assignedTo}
            error={errors.assignedTo}
            placeholder="Unassigned"
            onChange={(v) => {
              setForm({ ...form, assignedTo: v });
              clearField('assignedTo');
            }}
            options={[
              { value: '', label: 'Unassigned' },
              ...members.map((m) => ({
                value: m.id,
                label: `${m.name} · ${m.role.replaceAll('_', ' ')}`,
                searchText: m.email,
              })),
            ]}
          />
          <div className="sm:col-span-2 border-t border-[#EDF2F7] pt-5">
            <button
              type="submit"
              disabled={saving}
              className="brand-btn w-auto px-7 py-3.5 text-sm"
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
    </div>
  );
}
