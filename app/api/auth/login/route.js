import { badRequest, handler, json, readJson } from '@/lib/api';
import { publicUser, setAuthCookie } from '@/lib/auth';
import { signToken } from '@/lib/jwt';
import { issueOtpIfAllowed } from '@/lib/otp';
import { authenticate } from '@/lib/users';

export const POST = handler(async (request) => {
  const { email, password } = await readJson(request);

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw badRequest('Email and password are required');
  }

  const normalized = email.trim().toLowerCase();
  const user = await authenticate(normalized, password);

  // Same message for unknown email and wrong password.
  if (!user) {
    return json({ error: 'Invalid email or password' }, 401);
  }

  // Correct password but email never verified: send a fresh code instead of a session.
  if (!user.emailVerified) {
    await issueOtpIfAllowed({ email: normalized, name: user.name, purpose: 'verify-email' });
    return json(
      {
        error: 'Please verify your email first. We sent a new code to your inbox.',
        requiresVerification: true,
        email: normalized,
      },
      403
    );
  }

  const token = await signToken(user._id);
  const response = json({ user: publicUser(user), token });
  setAuthCookie(response, token);
  return response;
});
