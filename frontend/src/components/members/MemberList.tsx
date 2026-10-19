'use client';

import { IconEdit, IconTrash } from '@/components/ActionIcons';
import { PermissionChips } from '@/components/PermissionMatrix';
import { hasAnyPermission } from '@/lib/rbac';
import {
  ROLE_STYLES,
  initials,
  roleLabel,
  type TeamMember,
} from '@/lib/team';

type Props = {
  members: TeamMember[];
  showPermissions: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit?: (member: TeamMember) => void;
  onDelete?: (id: string) => void;
};

export function MemberList({
  members,
  showPermissions,
  canUpdate = false,
  canDelete = false,
  onEdit,
  onDelete,
}: Props) {
  const showActions = (canUpdate && onEdit) || (canDelete && onDelete);

  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:hidden">
        {members.map((member) => {
          const style = ROLE_STYLES[member.role];
          const staff = hasAnyPermission(member.permissions);
          return (
            <article
              key={member.id}
              className="relative overflow-hidden rounded-[1.25rem] border border-white/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.08)] ring-1 ring-[#E2E8F0]/80"
            >
              <div
                className={`absolute inset-y-0 left-0 w-[3px] ${style.bar}`}
                aria-hidden
              />
              <div className={`bg-gradient-to-br ${style.soft} from-40% px-4 pb-3.5 pt-4`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4ECB9A] to-[#2f9a74] text-[13px] font-bold tracking-wide text-white shadow-[0_6px_16px_rgba(62,180,137,0.4)]">
                    {initials(member.name)}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[15px] font-semibold tracking-tight text-[#0F172A]">
                      {member.name}
                    </p>
                    <span
                      className={`mt-1.5 inline-flex max-w-full whitespace-normal rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] shadow-sm ring-1 ${style.chip}`}
                    >
                      {roleLabel(member.role)}
                    </span>
                    {staff ? (
                      <span className="ml-1.5 inline-flex rounded-full bg-[#E8F8F1] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#2f9a74]">
                        Access
                      </span>
                    ) : null}
                  </div>
                  {showActions ? (
                    <div className="flex shrink-0 gap-1.5 pt-0.5">
                      {canUpdate && onEdit ? (
                        <button
                          type="button"
                          onClick={() => onEdit(member)}
                          aria-label={`Edit ${member.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D7F0E6] bg-white text-[#2f9a74] shadow-[0_2px_8px_rgba(47,154,116,0.15)] transition active:scale-95"
                        >
                          <IconEdit />
                        </button>
                      ) : null}
                      {canDelete && onDelete ? (
                        <button
                          type="button"
                          onClick={() => onDelete(member.id)}
                          aria-label={`Delete ${member.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-500 shadow-[0_2px_8px_rgba(244,63,94,0.12)] transition active:scale-95"
                        >
                          <IconTrash />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2 px-4 py-3.5">
                <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5 ring-1 ring-[#EEF2F7]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                    Email
                  </p>
                  <p className="mt-1 break-all text-[13px] font-medium leading-snug text-[#1E293B]">
                    {member.email}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5 ring-1 ring-[#EEF2F7]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                    Phone
                  </p>
                  <p className="mt-1 text-[13px] font-medium tabular-nums tracking-wide text-[#1E293B]">
                    {member.number}
                  </p>
                </div>
                {showPermissions ? (
                  <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5 ring-1 ring-[#EEF2F7]">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                      Permissions
                    </p>
                    <PermissionChips permissions={member.permissions} />
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[#EDF2F7] lg:block">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="bg-[#F4F7FB] text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              {showPermissions ? <th className="px-4 py-3">Permissions</th> : null}
              {showActions ? <th className="px-4 py-3 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const style = ROLE_STYLES[member.role];
              const staff = hasAnyPermission(member.permissions);
              return (
                <tr
                  key={member.id}
                  className="border-t border-[#F3F4F6] transition hover:bg-[#F9FAFB]"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3EB489] text-xs font-semibold text-white">
                        {initials(member.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#2D3748]">
                          {member.name}
                        </p>
                        {staff && !showPermissions ? (
                          <p className="text-[11px] font-medium text-[#2f9a74]">
                            Has access
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-[#4A5568]">
                    {member.number}
                  </td>
                  <td className="px-4 py-3.5 text-[#64748B]">{member.email}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 ${style.chip}`}
                    >
                      {roleLabel(member.role)}
                    </span>
                  </td>
                  {showPermissions ? (
                    <td className="px-4 py-3.5">
                      <PermissionChips permissions={member.permissions} />
                    </td>
                  ) : null}
                  {showActions ? (
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-2">
                        {canUpdate && onEdit ? (
                          <button
                            type="button"
                            onClick={() => onEdit(member)}
                            aria-label={`Edit ${member.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D7F0E6] bg-[#E8F8F1] text-[#2f9a74] shadow-sm transition hover:scale-105 hover:bg-[#D7F3E8] active:scale-95"
                          >
                            <IconEdit />
                          </button>
                        ) : null}
                        {canDelete && onDelete ? (
                          <button
                            type="button"
                            onClick={() => onDelete(member.id)}
                            aria-label={`Delete ${member.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 shadow-sm transition hover:scale-105 hover:bg-rose-100 active:scale-95"
                          >
                            <IconTrash />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
