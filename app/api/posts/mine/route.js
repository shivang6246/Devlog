import { handler, json } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { listPostsByAuthor } from '@/lib/data';

// GET /api/posts/mine — the caller's drafts and published posts
export const GET = handler(async (request) => {
  const user = await requireAuth(request);
  return json({ posts: await listPostsByAuthor(user._id) });
});
