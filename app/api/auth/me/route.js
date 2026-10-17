import { handler, json } from '@/lib/api';
import { publicUser, requireAuth } from '@/lib/auth';

export const GET = handler(async (request) => {
  const user = await requireAuth(request);
  return json({ user: publicUser(user) });
});
