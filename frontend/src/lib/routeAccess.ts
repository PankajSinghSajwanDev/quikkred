import { can, canAccessList, canAny, hasGrant, type AdminSession } from './rbac';
import type { UserSession } from './user';

export function adminPathAllowed(admin: AdminSession, pathname: string) {
  if (pathname.startsWith('/admin/logs')) return can(admin, 'tasks', 'read');
  if (pathname.startsWith('/admin/team')) return canAny(admin, 'team');
  if (pathname.startsWith('/admin/tasks/list')) {
    return canAccessList(admin, 'tasks');
  }
  if (pathname.startsWith('/admin/tasks/new')) {
    return can(admin, 'tasks', 'create') || can(admin, 'tasks', 'update');
  }
  if (/^\/admin\/tasks\/[a-fA-F0-9]{24}(\/|$)/.test(pathname)) {
    return canAccessList(admin, 'tasks');
  }
  if (pathname.startsWith('/admin/tasks')) {
    return (
      canAccessList(admin, 'tasks') ||
      can(admin, 'tasks', 'create') ||
      can(admin, 'tasks', 'update')
    );
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true;
  return true;
}

export function userPathAllowed(user: UserSession, pathname: string) {
  if (pathname.startsWith('/user/members')) {
    return hasGrant(user.permissions, 'team', 'read');
  }
  return true;
}
