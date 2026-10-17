import { handler, json, notFound } from '@/lib/api';
import { getUserProfile } from '@/lib/data';

// GET /api/users/:id — public profile + published posts (no email, no drafts)
export const GET = handler(async (_request, { params }) => {
  const { id } = await params;
  const profile = await getUserProfile(id);
  if (!profile) throw notFound('User not found');
  return json(profile);
});
