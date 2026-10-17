import { badRequest, handler, json, readEmail, readJson } from '@/lib/api';
import { publicUser, setAuthCookie } from '@/lib/auth';
import { signToken } from '@/lib/jwt';
import { consumeOtp } from '@/lib/otp';
import { findUserByEmail, updateUser } from '@/lib/users';

// POST /api/auth/reset-password { email, otp, newPassword } → sets the password and logs in
export const POST = handler(async (request) => {
  const body = await readJson(request);
  const email = readEmail(body.email);
  const { newPassword } = body;

  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 72) {
    throw badRequest('New password must be 8–72 characters');
  }

  const found = await findUserByEmail(email);
  if (!found) throw badRequest('This code is invalid or has expired. Request a new one.');

  await consumeOtp({ email, purpose: 'reset-password', code: body.otp });

  // emailVerified: they just proved they control the inbox.
  const user = await updateUser(found._id, { password: newPassword, emailVerified: true });

  const token = await signToken(user._id);
  const response = json({ user: publicUser(user), token, message: 'Password updated.' });
  setAuthCookie(response, token);
  return response;
});
