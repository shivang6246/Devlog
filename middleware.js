import { NextResponse } from 'next/server';
import { AUTH_COOKIE, verifyToken } from '@/lib/jwt';

const PROTECTED = ['/dashboard', '/editor', '/settings'];
const GUEST_ONLY = ['/login', '/register', '/verify-email', '/forgot-password'];

const matches = (pathname, prefixes) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Runs at the edge before render. Verifies the JWT signature + expiry from the
 * httpOnly cookie; the API handlers still re-check auth on every request.
 */
export async function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;

  if (matches(pathname, PROTECTED) && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('from', pathname + search);
    const response = NextResponse.redirect(url);
    if (token) response.cookies.delete(AUTH_COOKIE); // expired / tampered
    return response;
  }

  if (matches(pathname, GUEST_ONLY) && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/editor/:path*',
    '/settings/:path*',
    '/login',
    '/register',
    '/verify-email',
    '/forgot-password',
  ],
};
