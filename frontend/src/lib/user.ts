import type { Permissions } from './rbac';

export type UserSession = {
  id: string;
  name: string;
  email: string;
  role: string;
  number: string;
  permissions?: Permissions;
};
