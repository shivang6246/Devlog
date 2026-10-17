import { handler, json } from '@/lib/api';
import { getAuthUser, requireAuth } from '@/lib/auth';
import { likePost, publishedPostLikeState, unlikePost } from '@/lib/engagement';

// GET /api/posts/:id/like — { liked, likeCount } (liked is false when logged out)
export const GET = handler(async (request, { params }) => {
  const { idOrSlug: id } = await params;
  const user = await getAuthUser(request);
  return json(await publishedPostLikeState(id, user?._id));
});

// POST /api/posts/:id/like — like (idempotent)
export const POST = handler(async (request, { params }) => {
  const user = await requireAuth(request);
  const { idOrSlug: id } = await params;
  return json(await likePost(id, user._id));
});

// DELETE /api/posts/:id/like — unlike (idempotent)
export const DELETE = handler(async (request, { params }) => {
  const user = await requireAuth(request);
  const { idOrSlug: id } = await params;
  return json(await unlikePost(id, user._id));
});
