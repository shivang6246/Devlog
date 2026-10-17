/**
 * Optional Redis cache, using Upstash's REST API (fits serverless functions:
 * there is no TCP connection to open on each invocation).
 *
 * It's on when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set (or
 * KV_REST_API_URL + KV_REST_API_TOKEN, the names Vercel's Upstash integration
 * uses). Without them every call goes straight to the database, so the app
 * runs fine without Redis. Redis errors or slowness are never fatal either:
 * reads fall back to the database and Redis is skipped for COOLDOWN_MS.
 *
 * Public reads are stored together with the "content version" they were
 * computed at. Every write that can change a public page calls
 * bumpContentVersion() AFTER its database write, which turns every older
 * entry into a miss at once (old entries then expire through their TTL).
 *
 * scripts/seed.js imports this file by relative path: keep it free of `@/`
 * and extensionless imports.
 */
import { Redis } from '@upstash/redis';

const NS = 'devlog';
const VERSION_KEY = `${NS}:content-version`;
const CONTENT_TTL_SECONDS = 300;
const USER_TTL_SECONDS = 300;
const TIMEOUT_MS = 500;
const COOLDOWN_MS = 30_000;

function client() {
  if (globalThis.__redis === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    globalThis.__redis = url && token
      ? new Redis({ url, token, retry: { retries: 0 }, enableTelemetry: false })
      : null;
  }
  if (Date.now() < (globalThis.__redisPausedUntil || 0)) return null;
  return globalThis.__redis;
}

/** Runs one Redis call. On an error or a slow reply, pauses Redis for a while and returns `fallback`. */
async function attempt(run, fallback) {
  const redis = client();
  if (!redis) return fallback;
  let timer;
  try {
    return await Promise.race([
      run(redis),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no reply within ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    globalThis.__redisPausedUntil = Date.now() + COOLDOWN_MS;
    console.warn(`[cache] Redis unavailable, using the database for ${COOLDOWN_MS / 1000}s:`, err.message);
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

const toPlain = (value) => JSON.parse(JSON.stringify(value));

/**
 * Data that is identical for every visitor. `key` must come from a bounded set
 * (never raw search text), and `load` must never return drafts or anything
 * per-viewer. `null` results are not cached.
 */
export async function cachedContent(key, load) {
  if (!client()) return load();
  const entryKey = `${NS}:content:${key}`;
  const [version, entry] = await attempt((r) => r.mget(VERSION_KEY, entryKey), [null, null]);

  let current = version;
  if (current == null) {
    // First use (or the key was evicted): start from a value never used before.
    current = Date.now();
    await attempt((r) => r.set(VERSION_KEY, current, { nx: true }), null);
  }
  if (entry && entry.v === current) return entry.data;

  const data = await load();
  if (data != null) {
    await attempt((r) => r.set(entryKey, { v: current, data: toPlain(data) }, { ex: CONTENT_TTL_SECONDS }), null);
  }
  return data;
}

/** Marks every cached public read as stale. Call it after the database write. */
export async function bumpContentVersion() {
  await attempt(async (r) => {
    const v = await r.incr(VERSION_KEY);
    // The key was missing, so small numbers may have been used before: jump to a fresh value.
    if (v === 1) await r.set(VERSION_KEY, Date.now());
  }, null);
}

/** A user row (never the password hash) by id, cached for authenticated requests. */
export async function cachedUser(id, load) {
  if (!client()) return load();
  const key = `${NS}:user:${id}`;
  const hit = await attempt((r) => r.get(key), null);
  if (hit) return hit;

  const user = await load();
  if (!user) return null;
  const plain = toPlain(user); // same shape (ISO date strings) whether it came from Redis or the DB
  await attempt((r) => r.set(key, plain, { ex: USER_TTL_SECONDS }), null);
  return plain;
}

export async function forgetUser(id) {
  await attempt((r) => r.del(`${NS}:user:${id}`), null);
}
