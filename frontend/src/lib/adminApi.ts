import { apiRequest } from './http';
import { setAdminSessionFlag } from './session';

const TOKEN_KEY = 'admin_token';

export function getAdminToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  setAdminSessionFlag(Boolean(token));
}

export async function adminApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return apiRequest<T>('admin', getAdminToken(), path, options);
}
