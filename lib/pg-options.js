import postgres from 'postgres';

// Imported by lib/db.js AND by scripts/*.js (via a relative path), so keep this
// file free of `@/` imports.

/** postgres.js options for a Supabase (or any Postgres) connection string. */
export function pgOptions(url) {
  const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  return {
    ssl: local ? false : 'require',
    // Supabase's transaction pooler (port 6543) doesn't support prepared statements.
    prepare: false,
    max: 10,
    idle_timeout: 20,
    // Fail fast (8s) when the DB is unreachable, so the API answers 503 instead of hanging.
    connect_timeout: 8,
    // snake_case columns → camelCase keys (avatar_url → avatarUrl).
    transform: { column: { from: postgres.toCamel } },
    onnotice: () => {},
  };
}
