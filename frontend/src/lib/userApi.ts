import { apiRequest } from './http';
import { setUserSessionFlag } from './session';

const TOKEN_KEY = 'user_token';

export function getUserToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setUserToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  setUserSessionFlag(Boolean(token));
}

export async function userApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return apiRequest<T>('user', getUserToken(), path, options);
}
