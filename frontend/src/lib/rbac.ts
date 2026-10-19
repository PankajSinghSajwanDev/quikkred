export const RESOURCES = ['team', 'tasks'] as const;
export const ACTIONS = ['create', 'read', 'update', 'delete'] as const;

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];
export type CrudPermissions = Record<Action, boolean>;
export type Permissions = Record<Resource, CrudPermissions>;
export type AdminRole = 'admin' | 'sub_admin';

export type AdminSession = {
  id: string;
  username: string;
  role: AdminRole;
  active?: boolean;
  permissions: Permissions;
};

export const FULL_CRUD: CrudPermissions = {
  create: true,
  read: true,
  update: true,
  delete: true,
};

export const EMPTY_CRUD: CrudPermissions = {
  create: false,
  read: false,
  update: false,
  delete: false,
};

export function emptyPermissions(): Permissions {
  return {
    team: { ...EMPTY_CRUD },
    tasks: { ...EMPTY_CRUD },
  };
}

export function fullPermissions(): Permissions {
  return {
    team: { ...FULL_CRUD },
    tasks: { ...FULL_CRUD },
  };
}

export function isSuperAdmin(admin: AdminSession | null | undefined) {
  return admin?.role === 'admin';
}

export function can(
  admin: AdminSession | null | undefined,
  resource: Resource,
  action: Action,
) {
  if (!admin) return false;
  if (isSuperAdmin(admin)) return true;
  return Boolean(admin.permissions?.[resource]?.[action]);
}

export function canAny(
  admin: AdminSession | null | undefined,
  resource?: Resource,
) {
  if (!admin) return false;
  if (isSuperAdmin(admin)) return true;
  if (resource) {
    return ACTIONS.some((action) => admin.permissions?.[resource]?.[action]);
  }
  return RESOURCES.some((item) =>
    ACTIONS.some((action) => admin.permissions?.[item]?.[action]),
  );
}

export function canAccessList(
  admin: AdminSession | null | undefined,
  resource: Resource,
) {
  return (
    can(admin, resource, 'read') ||
    can(admin, resource, 'update') ||
    can(admin, resource, 'delete')
  );
}

export function resourceLabel(resource: Resource) {
  return resource === 'team' ? 'Members' : 'Tasks';
}

export function actionLabel(action: Action) {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export function permissionSummary(permissions: Permissions) {
  return RESOURCES.flatMap((resource) =>
    ACTIONS.filter((action) => permissions[resource][action]).map(
      (action) => `${resourceLabel(resource)} ${actionLabel(action)}`,
    ),
  );
}

export function hasAnyPermission(permissions?: Permissions | null) {
  if (!permissions) return false;
  return RESOURCES.some((resource) =>
    ACTIONS.some((action) => permissions[resource]?.[action]),
  );
}

export function hasGrant(
  permissions: Permissions | null | undefined,
  resource: Resource,
  action: Action,
) {
  return Boolean(permissions?.[resource]?.[action]);
}

export function hasAnyResourceGrant(
  permissions: Permissions | null | undefined,
  resource: Resource,
) {
  return ACTIONS.some((action) => hasGrant(permissions, resource, action));
}

/**
 * Member portal access.
 * - If admin granted any task permission, only those grants apply.
 * - Members with no task grants can only read/update their own work
 *   (no create/delete until admin enables it).
 */
export function memberCan(
  permissions: Permissions | null | undefined,
  resource: Resource,
  action: Action,
) {
  const staff = hasAnyResourceGrant(permissions, resource);
  if (!staff) {
    return resource === 'tasks' && (action === 'read' || action === 'update');
  }
  return hasGrant(permissions, resource, action);
}

export function memberSeesAllTasks(permissions: Permissions | null | undefined) {
  return hasGrant(permissions, 'tasks', 'read');
}
