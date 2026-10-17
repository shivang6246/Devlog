import { SignJWT, jwtVerify } from 'jose';
import { requireEnv } from './env';

// Edge-safe: imported by middleware.js, so no Node-only dependencies here.

export const AUTH_COOKIE = 'devlog_token';
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  return new TextEncoder().encode(requireEnv('JWT_SECRET'));
}

export async function signToken(userId) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

/** Returns the payload for a valid token, or null for anything else. */
export async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
    return payload.sub ? payload : null;
  } catch {
    return null;
  }
}
