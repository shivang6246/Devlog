import { cookies } from 'next/headers';
import { findUserByIdCached } from './users';
import { AUTH_COOKIE, TOKEN_TTL_SECONDS, verifyToken } from './jwt';
import { unauthorized } from './api';

/** Bearer header wins (Postman/API clients); otherwise the httpOnly cookie. */
function getToken(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1].trim();
  return request.cookies.get(AUTH_COOKIE)?.value || null;
}

async function userFromToken(token) {
  const payload = await verifyToken(token);
  if (!payload) return null;
  // Never includes the password hash. Cached in Redis; updateUser() clears the entry.
  return findUserByIdCached(payload.sub);
}

/** Returns the authenticated user, or null. Never trusts the client. */
export async function getAuthUser(request) {
  const token = getToken(request);
  if (!token) return null;
  return userFromToken(token);
}

/** Like getAuthUser but throws a 401 HttpError (caught by handler()) when unauthenticated. */
export async function requireAuth(request) {
  const user = await getAuthUser(request);
  if (!user) throw unauthorized();
  return user;
}

/** For Server Components: reads the session cookie via next/headers. */
export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return userFromToken(token);
}

export function setAuthCookie(response, token) {
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL_SECONDS,
  });
}

export function clearAuthCookie(response) {
  response.cookies.set(AUTH_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/** The only shape a user is ever returned in. No password, ever. */
export function publicUser(user) {
  if (!user) return null;
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
