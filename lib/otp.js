import crypto from 'node:crypto';
import { after } from 'next/server';
import { sql } from './db';
import { HttpError, badRequest } from './api';
import { requireEnv } from './env';
import { canSendMail, sendOtpEmail } from './email';

const SEND_FAILED = "We couldn't send the email right now. Please try again in a moment.";

export const OTP_TTL_MINUTES = 10;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_ATTEMPTS = 5;

function hashCode(email, purpose, code) {
  return crypto
    .createHmac('sha256', requireEnv('JWT_SECRET'))
    .update(`${purpose}:${email}:${code}`)
    .digest('hex');
}

function safeEqual(a, b) {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/**
 * Generates a fresh 6-digit code (replacing any previous one), stores its
 * HMAC, and emails it. Throws 429 if a code was sent less than a minute ago.
 *
 * The email goes out AFTER the response (next/server `after()`; on Vercel it
 * runs via waitUntil): SMTP takes seconds and the client doesn't need to wait.
 * It also means forgot-password answers in the same time whether or not the
 * account exists. Must be called from a route handler.
 */
export async function issueOtp({ email, name, purpose }) {
  // A production server without SMTP can never deliver the code: fail loudly up front.
  if (!canSendMail()) throw new HttpError(502, SEND_FAILED);

  const now = Date.now();
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  const codeHash = hashCode(email, purpose, code);

  // Insert, or replace the previous code — but only once its cooldown is over.
  // Doing the cooldown check inside the upsert makes it race-free.
  const [issued] = await sql`
    insert into otps (email, purpose, code_hash, expires_at, attempts, last_sent_at)
    values (${email}, ${purpose}, ${codeHash},
            ${new Date(now + OTP_TTL_MINUTES * 60 * 1000)}, 0, ${new Date(now)})
    on conflict (email, purpose) do update set
      code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0,
      last_sent_at = excluded.last_sent_at, updated_at = now()
    where otps.last_sent_at <= ${new Date(now - RESEND_COOLDOWN_SECONDS * 1000)}
    returning email`;
  if (!issued) {
    const [existing] = await sql`select last_sent_at from otps where email = ${email} and purpose = ${purpose}`;
    const waitMs = existing ? existing.lastSentAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000 - now : 1000;
    throw new HttpError(429, `Please wait ${Math.max(1, Math.ceil(waitMs / 1000))}s before requesting another code.`);
  }

  after(async () => {
    try {
      await sendOtpEmail({ to: email, name, code, purpose, minutes: OTP_TTL_MINUTES });
    } catch (err) {
      console.error('[otp] Failed to send email:', err);
      // Drop this code (not a newer one) so the cooldown doesn't block an immediate resend.
      await sql`delete from otps where email = ${email} and purpose = ${purpose} and code_hash = ${codeHash}`
        .catch((e) => console.error('[otp] Cleanup failed:', e.message));
    }
    // Postgres has no TTL index: sweep expired codes whenever a new one is issued.
    await sql`delete from otps where expires_at < now()`.catch(() => {});
  });
}

/** Like issueOtp, but a still-running cooldown is not an error (a code is already on its way). */
export async function issueOtpIfAllowed(args) {
  try {
    await issueOtp(args);
  } catch (err) {
    if (!(err instanceof HttpError && err.status === 429)) throw err;
  }
}

/**
 * Verifies and consumes a code. Single use; each wrong guess counts toward
 * MAX_ATTEMPTS (incremented atomically, so parallel guesses can't bypass it).
 */
export async function consumeOtp({ email, purpose, code }) {
  const clean = String(code ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) throw badRequest('Enter the 6-digit code from your email.');

  const now = new Date();
  const [otp] = await sql`
    update otps set attempts = attempts + 1, updated_at = now()
    where email = ${email} and purpose = ${purpose}
      and expires_at > ${now} and attempts < ${MAX_ATTEMPTS}
    returning code_hash, attempts`;

  if (!otp) {
    const [stale] = await sql`select attempts, expires_at from otps where email = ${email} and purpose = ${purpose}`;
    if (stale && stale.expiresAt > now && stale.attempts >= MAX_ATTEMPTS) {
      throw new HttpError(429, 'Too many incorrect attempts. Request a new code.');
    }
    throw badRequest('This code is invalid or has expired. Request a new one.');
  }

  if (!safeEqual(hashCode(email, purpose, clean), otp.codeHash)) {
    const left = MAX_ATTEMPTS - otp.attempts;
    throw badRequest(
      left > 0
        ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
        : 'Incorrect code. Too many attempts — request a new code.'
    );
  }

  // Single use: only the request that deletes it wins.
  const { count } = await sql`
    delete from otps where email = ${email} and purpose = ${purpose} and code_hash = ${otp.codeHash}`;
  if (!count) throw badRequest('This code has already been used. Request a new one.');
}
