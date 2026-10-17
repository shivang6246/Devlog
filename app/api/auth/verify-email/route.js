import { badRequest, handler, json, readEmail, readJson } from '@/lib/api';
import { publicUser, setAuthCookie } from '@/lib/auth';
import { signToken } from '@/lib/jwt';
import { consumeOtp } from '@/lib/otp';
import { findUserByEmail, updateUser } from '@/lib/users';

// POST /api/auth/verify-email { email, otp } → marks the email verified and logs the user in
export const POST = handler(async (request) => {
  const body = await readJson(request);
  const email = readEmail(body.email);

  const found = await findUserByEmail(email);
  if (!found) throw badRequest('This code is invalid or has expired. Request a new one.');
  if (found.emailVerified) throw badRequest('This email is already verified. Please log in.');

  await consumeOtp({ email, purpose: 'verify-email', code: body.otp });

  const user = await updateUser(found._id, { emailVerified: true });

  const token = await signToken(user._id);
  const response = json({ user: publicUser(user), token });
  setAuthCookie(response, token);
  return response;
});
