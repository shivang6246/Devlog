import { handler, json, readEmail, readJson } from '@/lib/api';
import { issueOtpIfAllowed } from '@/lib/otp';
import { findUserByEmail } from '@/lib/users';

// POST /api/auth/forgot-password { email } → emails a password-reset code
export const POST = handler(async (request) => {
  const body = await readJson(request);
  const email = readEmail(body.email);

  const user = await findUserByEmail(email);
  if (user) {
    await issueOtpIfAllowed({ email, name: user.name, purpose: 'reset-password' });
  }

  // Same response whether or not the account exists (no email enumeration).
  return json({ message: 'If an account exists for that email, we sent a reset code.' });
});
