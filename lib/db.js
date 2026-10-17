import postgres from 'postgres';
import { requireEnv } from './env';
import { pgOptions } from './pg-options';

/**
 * One postgres.js pool, cached on globalThis so Next.js hot reload (which
 * re-evaluates modules) and concurrent requests share it. Nothing connects
 * until the first query runs.
 */
function client() {
  if (!globalThis.__sql) {
    const url = requireEnv('DATABASE_URL');
    globalThis.__sql = postgres(url, pgOptions(url));
  }
  return globalThis.__sql;
}

/**
 * Tagged-template SQL: sql`select * from posts where id = ${id}`.
 * Values are always sent as bind parameters, never spliced into the SQL text.
 * Also exposes the postgres.js helpers (sql.begin, sql(obj, ...cols), …).
 */
export const sql = new Proxy(() => {}, {
  apply: (_target, _this, args) => client()(...args),
  get: (_target, prop) => client()[prop],
});

const NETWORK_CODES = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH',
  'CONNECT_TIMEOUT', 'CONNECTION_CLOSED', 'CONNECTION_ENDED', 'CONNECTION_DESTROYED',
]);

/** Why the database can't serve requests (for the server log), or null for an ordinary query error. */
export function dbUnavailableReason(err) {
  const code = String(err?.code || '');
  if (code === '42P01') return 'tables are missing — run `npm run db:setup`';
  if (code === '28P01' || code === '28000' || /tenant or user not found/i.test(err?.message || '')) {
    return 'login rejected — check the user and password in DATABASE_URL';
  }
  if (code === '3D000') return 'database does not exist — check DATABASE_URL';
  if (NETWORK_CODES.has(code) || /^(08|53|57P)/.test(code)) {
    return 'cannot reach the server — check DATABASE_URL and that the Supabase project is not paused';
  }
  return null;
}
