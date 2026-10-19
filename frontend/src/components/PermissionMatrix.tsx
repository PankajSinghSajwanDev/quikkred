'use client';

import {
  ACTIONS,
  RESOURCES,
  actionLabel,
  hasAnyPermission,
  permissionSummary,
  resourceLabel,
  type Action,
  type Permissions,
  type Resource,
} from '@/lib/rbac';

function togglePermission(
  permissions: Permissions,
  resource: Resource,
  action: Action,
): Permissions {
  return {
    ...permissions,
    [resource]: {
      ...permissions[resource],
      [action]: !permissions[resource][action],
    },
  };
}

function setResourceAll(
  permissions: Permissions,
  resource: Resource,
  value: boolean,
): Permissions {
  return {
    ...permissions,
    [resource]: {
      create: value,
      read: value,
      update: value,
      delete: value,
    },
  };
}

function resourceAllOn(permissions: Permissions, resource: Resource) {
  return ACTIONS.every((action) => permissions[resource][action]);
}

type MatrixProps = {
  value: Permissions;
  onChange: (next: Permissions) => void;
  error?: string;
  optional?: boolean;
};

export function PermissionMatrix({
  value,
  onChange,
  error,
  optional = false,
}: MatrixProps) {
  return (
    <div>
      <div
        className={`overflow-hidden rounded-2xl border ${
          error ? 'border-rose-400' : 'border-[#E5E7EB]'
        }`}
      >
        <div className="border-b border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
          <p className="text-sm font-semibold text-[#1F2937]">Permissions</p>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            {optional
              ? 'Optional. Grant Create, Read, Update, or Delete so this member can use the admin panel.'
              : 'Choose Create, Read, Update, and Delete for Members and Tasks.'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-white text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
                <th className="px-4 py-3">Module</th>
                {ACTIONS.map((action) => (
                  <th key={action} className="px-3 py-3 text-center">
                    {actionLabel(action)}
                  </th>
                ))}
                <th className="px-3 py-3 text-center">All</th>
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((resource) => (
                <tr key={resource} className="border-t border-[#F3F4F6]">
                  <td className="px-4 py-3.5 font-semibold text-[#1F2937]">
                    {resourceLabel(resource)}
                  </td>
                  {ACTIONS.map((action) => (
                    <td key={action} className="px-3 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={value[resource][action]}
                        onChange={() =>
                          onChange(togglePermission(value, resource, action))
                        }
                        className="h-4 w-4 accent-[#3EB489]"
                        aria-label={`${resourceLabel(resource)} ${actionLabel(action)}`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={resourceAllOn(value, resource)}
                      onChange={(e) =>
                        onChange(setResourceAll(value, resource, e.target.checked))
                      }
                      className="h-4 w-4 accent-[#3EB489]"
                      aria-label={`All ${resourceLabel(resource)} permissions`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PermissionChips({ permissions }: { permissions?: Permissions }) {
  if (!permissions || !hasAnyPermission(permissions)) {
    return <span className="text-xs text-[#9CA3AF]">No access</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {permissionSummary(permissions).map((label) => (
        <span
          key={label}
          className="rounded-full bg-[#E8F8F1] px-2 py-1 text-[10px] font-semibold text-[#2f9a74]"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
