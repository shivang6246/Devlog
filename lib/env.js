const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'];

/**
 * Throws if a required env var is missing. Called from instrumentation.js at
 * server startup and again lazily by lib/db.js and lib/jwt.js, so a
 * misconfigured deploy fails loudly instead of limping along.
 */
export function assertEnv() {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(
      `[DevLog] Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env.local and fill them in (or set them in your Vercel project).'
    );
  }
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[DevLog] Missing required environment variable ${name}. ` +
        'Copy .env.example to .env.local and fill it in.'
    );
  }
  return value;
}
