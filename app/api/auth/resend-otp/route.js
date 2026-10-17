import { handler, json, readEmail, readJson } from '@/lib/api';
import { issueOtp } from '@/lib/otp';
import { findUserByEmail } from '@/lib/users';

// POST /api/auth/resend-otp { email } → new verification code (60s cooldown → 429)
export const POST = handler(async (request) => {
  const body = await readJson(request);
  const email = readEmail(body.email);

  const user = await findUserByEmail(email);
  if (user && !user.emailVerified) {
    await issueOtp({ email, name: user.name, purpose: 'verify-email' });
  }

  // Same response whether or not the account exists (no email enumeration).
  return json({ message: 'If that account is awaiting verification, a new code is on its way.' });
});
