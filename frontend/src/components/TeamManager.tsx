'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/components/AdminShell';
import { useFormErrors } from '@/components/form';
import {
  MemberForm,
  emptyMemberForm,
  type MemberFormState,
} from '@/components/members/MemberForm';
import { MemberList } from '@/components/members/MemberList';
import { PremiumSelect } from '@/components/PremiumSelect';
import { SearchField } from '@/components/SearchField';
import { SegmentTabs } from '@/components/SegmentTabs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { adminApi } from '@/lib/adminApi';
import { can, emptyPermissions, hasAnyPermission, isSuperAdmin } from '@/lib/rbac';
import { memberErrors } from '@/lib/validation';
import {
  TEAM_ROLES,
  roleLabel,
  type TeamMember,
} from '@/lib/team';

type MemberTab = 'all' | 'staff';

const PREVIEW_LIMIT = 8;

export function TeamManager() {
  const admin = useAdminSession();
  const canCreate = can(admin, 'team', 'create');
  const canUpdate = can(admin, 'team', 'update');
  const canDelete = can(admin, 'team', 'delete');
  const canRead = can(admin, 'team', 'read');
  const canGrantPermissions = isSuperAdmin(admin);
  const showList = canRead || canUpdate || canDelete;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [form, setForm] = useState<MemberFormState>(emptyMemberForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { errors, clearField, clearAll, run, applyApiError, setFieldError } =
    useFormErrors();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const [roleFilter, setRoleFilter] = useState('all');
  const [tab, setTab] = useState<MemberTab>('all');
  const [showFullList, setShowFullList] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const sync = () => {
      if (mq.matches) setShowFullList(true);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    setShowFullList(false);
  }, [debouncedQuery, roleFilter, tab]);

  const staffCount = useMemo(
    () => members.filter((m) => hasAnyPermission(m.permissions)).length,
    [members],
  );

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (tab === 'staff' && !hasAnyPermission(m.permissions)) return false;
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (!q) return true;
      const hay = [m.name, m.number, m.email, m.role, roleLabel(m.role)]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [members, debouncedQuery, roleFilter, tab]);

  const visible = showFullList ? filtered : filtered.slice(0, PREVIEW_LIMIT);
  const hasMore = filtered.length > PREVIEW_LIMIT;
  const formOpen = showForm || Boolean(editingId);

  const load = async () => {
    try {
      const data = await adminApi<TeamMember[]>('/admin/team');
      setMembers(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showList) {
      void load();
      return;
    }
    setLoading(false);
  }, [showList]);

  const closeForm = () => {
    setForm(emptyMemberForm());
    setEditingId(null);
    setShowForm(false);
    clearAll();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyMemberForm());
    setShowForm(true);
    setError('');
    setSuccess('');
    clearAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!run(memberErrors(form, Boolean(editingId)))) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        number: form.number,
        email: form.email,
        role: form.role,
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }
      if (canGrantPermissions) {
        payload.permissions = form.permissions;
      }

      if (editingId) {
        await adminApi(`/admin/team/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccess(
          form.password.trim()
            ? 'Member updated · password changed'
            : 'Member updated',
        );
      } else {
        await adminApi('/admin/team', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccess(
          hasAnyPermission(form.permissions)
            ? 'Member created with admin access'
            : 'Member created',
        );
      }
      closeForm();
      await load();
    } catch (err) {
      if (!applyApiError(err)) {
        setError(err instanceof Error ? err.message : 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setShowForm(true);
    setForm({
      name: member.name,
      number: member.number,
      email: member.email,
      role: member.role,
      password: '',
      permissions: member.permissions || emptyPermissions(),
    });
    setSuccess('');
    setError('');
    clearAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this member?')) return;
    setError('');
    setSuccess('');
    try {
      await adminApi(`/admin/team/${id}`, { method: 'DELETE' });
      if (editingId === id) closeForm();
      setSuccess('Member deleted');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const clearFilters = () => {
    setRoleFilter('all');
    setQuery('');
    setShowFullList(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="hidden lg:block">
          <h2 className="text-2xl font-semibold tracking-tight text-[#1F2937]">
            Members
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            {members.length} people in your workspace
            {staffCount ? ` · ${staffCount} with access` : ''}
          </p>
        </div>
        <p className="text-sm text-[#6B7280] lg:hidden">
          {members.length} people
        </p>
        {canCreate ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-[#3EB489] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#2f9a74] lg:px-4 lg:py-2.5"
          >
            + Add Member
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-sm text-teal-800">
          {success}
        </p>
      ) : null}

      {formOpen ? (
        <MemberForm
          form={form}
          errors={errors}
          editing={Boolean(editingId)}
          saving={saving}
          canGrantPermissions={canGrantPermissions}
          onChange={setForm}
          onSubmit={(e) => void onSubmit(e)}
          onCancel={closeForm}
          onClearError={clearField}
          onFieldError={setFieldError}
        />
      ) : null}

      {showList ? (
        <>
          <section className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
            <SegmentTabs
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'all', label: 'All members', count: members.length },
                { id: 'staff', label: 'With permissions', count: staffCount },
              ]}
            />
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3">
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="Search name, email, or number"
                showClear={roleFilter !== 'all' || Boolean(query)}
                onClear={clearFilters}
              />
              <div className="w-full lg:w-52">
                <PremiumSelect
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={[
                    { value: 'all', label: 'All roles' },
                    ...TEAM_ROLES.map((role) => ({
                      value: role,
                      label: roleLabel(role),
                    })),
                  ]}
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border-0 bg-transparent lg:border lg:border-[#E5E7EB] lg:bg-white">
            <div className="mb-2 flex items-center justify-between px-0.5 lg:mb-0 lg:border-b lg:border-[#E5E7EB] lg:px-5 lg:py-3.5">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-[#0F172A] lg:text-base lg:text-[#1F2937]">
                  {tab === 'staff' ? 'Members with permissions' : 'All members'}
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Showing {visible.length} of {filtered.length}
                </p>
              </div>
            </div>

            <div className="p-0 lg:p-4">
              {loading ? (
                <div className="rounded-2xl bg-[#F7FAFC] px-4 py-12 text-center text-sm text-[#718096]">
                  Loading members…
                </div>
              ) : members.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#CBD5E0] bg-[#F7FAFC] px-4 py-14 text-center">
                  <p className="text-sm font-semibold text-[#2D3748]">No members yet</p>
                  <p className="mt-1 text-sm text-[#718096]">
                    {canCreate
                      ? 'Click “Add Member” to add the first member.'
                      : 'No members to show.'}
                  </p>
                  {canCreate ? (
                    <button
                      type="button"
                      onClick={openCreate}
                      className="mt-4 rounded-full bg-[#3EB489] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2f9a74]"
                    >
                      + Add Member
                    </button>
                  ) : null}
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#CBD5E0] bg-[#F7FAFC] px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-[#2D3748]">
                    {tab === 'staff' && !debouncedQuery && roleFilter === 'all'
                      ? 'No members with permissions'
                      : 'No matches'}
                  </p>
                  <p className="mt-1 text-sm text-[#718096]">
                    {tab === 'staff' && !debouncedQuery && roleFilter === 'all'
                      ? 'Grant Create, Read, Update, or Delete when adding a member.'
                      : 'Try another search or role filter.'}
                  </p>
                </div>
              ) : (
                <>
                  <MemberList
                    members={visible}
                    showPermissions={tab === 'staff'}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    onEdit={onEdit}
                    onDelete={(id) => void onDelete(id)}
                  />
                  {hasMore ? (
                    <div className="mt-3 hidden flex-col items-center gap-2 rounded-2xl bg-[#F8FAFC] px-4 py-3 lg:flex lg:flex-row lg:justify-between">
                      <p className="text-sm text-[#718096]">
                        Preview first {PREVIEW_LIMIT} · {filtered.length} total
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowFullList((v) => !v)}
                        className="rounded-full border border-[#3EB489]/30 bg-[#E8F8F1] px-4 py-2 text-sm font-semibold text-[#2f9a74] transition hover:bg-[#D7F3E8]"
                      >
                        {showFullList
                          ? 'Show less'
                          : `View full list (${filtered.length})`}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
