const ADMIN_COOKIE = 'qk_admin';
const USER_COOKIE = 'qk_user';

function writeCookie(name: string, value: string | null) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  if (value) {
    document.cookie = `${name}=${value}; Path=/; SameSite=Lax; Max-Age=86400${secure}`;
  } else {
    document.cookie = `${name}=; Path=/; SameSite=Lax; Max-Age=0${secure}`;
  }
}

export function setAdminSessionFlag(on: boolean) {
  writeCookie(ADMIN_COOKIE, on ? '1' : null);
}

export function setUserSessionFlag(on: boolean) {
  writeCookie(USER_COOKIE, on ? '1' : null);
}

export function redirectToLogin(kind: 'admin' | 'user') {
  if (typeof window === 'undefined') return;
  const target = kind === 'admin' ? '/admin/login' : '/user/login';
  if (window.location.pathname === target) return;
  window.location.replace(target);
}
