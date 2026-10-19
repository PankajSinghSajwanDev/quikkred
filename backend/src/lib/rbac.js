const RESOURCES = ['team', 'tasks'];
const ACTIONS = ['create', 'read', 'update', 'delete'];

const FULL_CRUD = Object.freeze({
  create: true,
  read: true,
  update: true,
  delete: true,
});

const EMPTY_CRUD = Object.freeze({
  create: false,
  read: false,
  update: false,
  delete: false,
});

const FULL_PERMISSIONS = Object.freeze({
  team: { ...FULL_CRUD },
  tasks: { ...FULL_CRUD },
});

function emptyPermissions() {
  return {
    team: { ...EMPTY_CRUD },
    tasks: { ...EMPTY_CRUD },
  };
}

function normalizeCrud(input) {
  const src = input && typeof input === 'object' ? input : {};
  return {
    create: Boolean(src.create),
    read: Boolean(src.read),
    update: Boolean(src.update),
    delete: Boolean(src.delete),
  };
}

function normalizePermissions(input) {
  const src = input && typeof input === 'object' ? input : {};
  return {
    team: normalizeCrud(src.team),
    tasks: normalizeCrud(src.tasks),
  };
}

function countGranted(permissions) {
  const normalized = normalizePermissions(permissions);
  let count = 0;
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      if (normalized[resource][action]) count += 1;
    }
  }
  return count;
}

function adminRole(admin) {
  return admin?.role === 'sub_admin' ? 'sub_admin' : 'admin';
}

function isSuperAdmin(admin) {
  return adminRole(admin) === 'admin';
}

function hasPermission(admin, resource, action) {
  if (!RESOURCES.includes(resource) || !ACTIONS.includes(action)) return false;
  if (isSuperAdmin(admin)) return true;
  return Boolean(admin?.permissions?.[resource]?.[action]);
}

function serializeAdmin(admin) {
  const role = adminRole(admin);
  return {
    id: String(admin._id || admin.id),
    username: admin.username,
    role,
    active: admin.active !== false,
    permissions:
      role === 'admin' ? { ...FULL_PERMISSIONS, team: { ...FULL_CRUD }, tasks: { ...FULL_CRUD } } : normalizePermissions(admin.permissions),
  };
}

function serializeMemberStaff(member) {
  return {
    id: String(member._id || member.id),
    username: member.email,
    name: member.name,
    role: 'sub_admin',
    actor: 'member',
    active: true,
    permissions: normalizePermissions(member.permissions),
  };
}

function serializeUser(member) {
  return {
    id: String(member._id || member.id),
    name: member.name,
    email: member.email,
    role: member.role,
    number: member.number,
    permissions: normalizePermissions(member.permissions),
  };
}

function hasAnyPermission(permissions) {
  return countGranted(permissions) > 0;
}

function hasGrant(permissions, resource, action) {
  if (!RESOURCES.includes(resource) || !ACTIONS.includes(action)) return false;
  return Boolean(permissions?.[resource]?.[action]);
}

function hasAnyResourceGrant(permissions, resource) {
  return ACTIONS.some((action) => hasGrant(permissions, resource, action));
}

/**
 * Member portal access. If the member has any grant on a resource, only those
 * grants apply. Members with no task grants keep default self-service
 * (create / read / update their own work, no delete).
 */
function memberCan(permissions, resource, action) {
  const staff = hasAnyResourceGrant(permissions, resource);
  if (!staff) {
    return resource === 'tasks' && (action === 'create' || action === 'read' || action === 'update');
  }
  return hasGrant(permissions, resource, action);
}

function memberSeesAllTasks(permissions) {
  return hasGrant(permissions, 'tasks', 'read');
}

module.exports = {
  RESOURCES,
  ACTIONS,
  FULL_PERMISSIONS,
  emptyPermissions,
  normalizePermissions,
  countGranted,
  adminRole,
  isSuperAdmin,
  hasPermission,
  hasAnyPermission,
  hasGrant,
  hasAnyResourceGrant,
  memberCan,
  memberSeesAllTasks,
  serializeAdmin,
  serializeMemberStaff,
  serializeUser,
};
