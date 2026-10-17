import { handler, json } from '@/lib/api';
import { clearAuthCookie } from '@/lib/auth';

export const POST = handler(async () => {
  const response = json({ message: 'Logged out' });
  clearAuthCookie(response);
  return response;
});
