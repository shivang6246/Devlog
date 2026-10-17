import { assertEnv } from './lib/env';

// Runs once when the Next.js server boots (dev, start, and on Vercel).
export function register() {
  assertEnv();
  if (
    process.env.NODE_ENV === 'production' &&
    !(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  ) {
    console.warn('[DevLog] SMTP is not configured — sign-up and password-reset emails will fail.');
  }
}
