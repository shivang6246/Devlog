import { badRequest, handler, json, readEmail, readJson } from '@/lib/api';
import { createUser, findUserByEmail, updateUser } from '@/lib/users';
import { issueOtpIfAllowed } from '@/lib/otp';

/**
 * Creates an unverified account and emails a 6-digit code. No session is
 * issued here — the client must call POST /api/auth/verify-email next.
 */
export const POST = handler(async (request) => {
  const { name, email: rawEmail, password } = await readJson(request);

  if (typeof name !== 'string' || !name.trim()) throw badRequest('Name is required');
  const email = readEmail(rawEmail);
  if (typeof password !== 'string' || password.length < 8) {
    throw badRequest('Password must be at least 8 characters');
  }
  if (password.length > 72) throw badRequest('Password must be at most 72 characters');

  let user = await findUserByEmail(email);
  if (user?.emailVerified) {
    return json({ error: 'An account with that email already exists' }, 409);
  }

  if (user) {
    // An abandoned, never-verified sign-up: let the person start over.
    user = await updateUser(user._id, { name, password });
  } else {
    user = await createUser({ name, email, password, emailVerified: false });
  }

  await issueOtpIfAllowed({ email, name: user.name, purpose: 'verify-email' });

  return json(
    {
      requiresVerification: true,
      email,
      message: `We sent a 6-digit code to ${email}. Enter it to activate your account.`,
    },
    201
  );
});
