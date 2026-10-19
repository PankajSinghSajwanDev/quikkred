import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const adminOk = req.cookies.get('qk_admin')?.value === '1';
  const userOk = req.cookies.get('qk_user')?.value === '1';

  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !adminOk) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/user') && pathname !== '/user/login' && !userOk) {
    const url = req.nextUrl.clone();
    url.pathname = '/user/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/user', '/user/:path*'],
};
