import { ApiError, parseApiError } from './apiError';
import {
  redirectToLogin,
  setAdminSessionFlag,
  setUserSessionFlag,
} from './session';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const inflight = new Map<string, Promise<unknown>>();

function flightKey(path: string, method: string, body: BodyInit | null | undefined) {
  const payload = typeof body === 'string' ? body : '';
  return `${method}:${path}:${payload}`;
}

function isAuthPath(path: string) {
  return (
    path.endsWith('/login') ||
    path.endsWith('/setup') ||
    path.endsWith('/status')
  );
}

function clearSession(kind: 'admin' | 'user') {
  if (typeof window === 'undefined') return;
  if (kind === 'admin') {
    localStorage.removeItem('admin_token');
    setAdminSessionFlag(false);
  } else {
    localStorage.removeItem('user_token');
    setUserSessionFlag(false);
  }
}

function handleUnauthorized(path: string, kind: 'admin' | 'user') {
  if (isAuthPath(path)) return;
  clearSession(kind);
  redirectToLogin(kind);
}

export async function apiRequest<T>(
  kind: 'admin' | 'user',
  token: string | null,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const key = flightKey(path, method, options.body);
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const pending = (async () => {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const signal = options.signal
      ? anySignal([options.signal, controller.signal])
      : controller.signal;

    try {
      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        method,
        headers,
        signal,
      });

      if (res.status === 401) {
        handleUnauthorized(path, kind);
        throw await parseApiError(res);
      }

      if (res.status === 429) {
        const err = await parseApiError(res);
        throw new ApiError(err.message || 'Too many requests', 429, err.fieldErrors);
      }

      if (!res.ok) {
        throw await parseApiError(res);
      }

      if (res.status === 204) return {} as T;
      return (await res.json().catch(() => ({}))) as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError('Request timed out. Please try again.', 408);
      }
      throw new ApiError('Network error. Check your connection.', 0);
    } finally {
      clearTimeout(timer);
      inflight.delete(key);
    }
  })();

  inflight.set(key, pending);
  return pending as Promise<T>;
}

function anySignal(signals: AbortSignal[]) {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), {
      once: true,
    });
  }
  return controller.signal;
}
