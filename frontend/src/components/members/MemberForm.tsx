'use client';

import {
  PasswordField,
  SelectField,
  TextField,
} from '@/components/form';
import { PermissionMatrix } from '@/components/PermissionMatrix';
import {
  emptyPermissions,
  type Permissions,
} from '@/lib/rbac';
import {
  email as emailRule,
  password as passwordRule,
  personName,
  phone,
} from '@/lib/validation';
import { TEAM_ROLES, roleLabel, type TeamRole } from '@/lib/team';

export type MemberFormState = {
  name: string;
  number: string;
  email: string;
  role: TeamRole;
  password: string;
  permissions: Permissions;
};

export const emptyMemberForm = (): MemberFormState => ({
  name: '',
  number: '',
  email: '',
  role: 'developer',
  password: '',
  permissions: emptyPermissions(),
});

type Props = {
  form: MemberFormState;
  errors: Record<string, string>;
  editing: boolean;
  saving: boolean;
  canGrantPermissions: boolean;
  onChange: (next: MemberFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onClearError: (field: string) => void;
  onFieldError: (field: string, message: string | null) => void;
};

export function MemberForm({
  form,
  errors,
  editing,
  saving,
  canGrantPermissions,
  onChange,
  onSubmit,
  onCancel,
  onClearError,
  onFieldError,
}: Props) {
  const patch = (partial: Partial<MemberFormState>) =>
    onChange({ ...form, ...partial });

  return (
    <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 lg:mb-5">
        <div>
          <h3 className="text-base font-semibold text-[#1F2937] lg:text-lg">
            {editing ? 'Edit member' : 'Create member'}
          </h3>
          <p className="mt-1 text-sm text-[#6B7280]">
            {editing
              ? 'Update details. Leave password blank to keep current.'
              : 'Name, number, email, role, login password, and optional permissions'}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[#E5E7EB] px-3.5 py-2 text-sm font-medium text-[#4B5563] hover:bg-[#F9FAFB]"
        >
          Cancel
        </button>
      </div>

      <form
        noValidate
        onSubmit={onSubmit}
        className="grid gap-5 sm:grid-cols-2"
      >
        <TextField
          label="Name"
          value={form.name}
          error={errors.name}
          placeholder="Full name"
          maxLength={80}
          onChange={(name) => {
            patch({ name });
            onClearError('name');
          }}
          onBlur={(name) => onFieldError('name', personName(name))}
        />
        <TextField
          label="Number"
          value={form.number}
          error={errors.number}
          placeholder="Phone number"
          inputMode="tel"
          maxLength={20}
          onChange={(number) => {
            patch({ number });
            onClearError('number');
          }}
          onBlur={(number) => onFieldError('number', phone(number))}
        />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          error={errors.email}
          placeholder="email@company.com"
          autoComplete="email"
          maxLength={254}
          onChange={(email) => {
            patch({ email });
            onClearError('email');
          }}
          onBlur={(email) => onFieldError('email', emailRule(email))}
        />
        <SelectField
          label="Role"
          value={form.role}
          error={errors.role}
          onChange={(v) => {
            patch({ role: v as TeamRole });
            onClearError('role');
          }}
          options={TEAM_ROLES.map((role) => ({
            value: role,
            label: roleLabel(role),
          }))}
        />
        <PasswordField
          label={editing ? 'New password (optional)' : 'Password (Member login)'}
          value={form.password}
          error={errors.password}
          hint={
            editing
              ? 'Leave blank to keep the current password'
              : canGrantPermissions
                ? 'Also used for admin login if you grant permissions'
                : undefined
          }
          placeholder={
            editing ? 'Leave blank to keep current' : 'At least 4 characters'
          }
          autoComplete="new-password"
          onChange={(password) => {
            patch({ password });
            onClearError('password');
          }}
          onBlur={(value) =>
            onFieldError(
              'password',
              passwordRule(value, { min: 4, optional: editing }),
            )
          }
        />
        {canGrantPermissions ? (
          <div className="sm:col-span-2">
            <PermissionMatrix
              optional
              value={form.permissions}
              error={errors.permissions}
              onChange={(permissions) => {
                patch({ permissions });
                onClearError('permissions');
              }}
            />
          </div>
        ) : null}
        <div className="sm:col-span-2 border-t border-[#EDF2F7] pt-5">
          <button
            type="submit"
            disabled={saving}
            className="brand-btn w-auto min-w-[160px] px-7"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create member'}
          </button>
        </div>
      </form>
    </section>
  );
}
