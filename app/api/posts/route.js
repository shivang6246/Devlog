import { handler, json, readJson } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { getPostById, listPublishedPosts } from '@/lib/data';
import { createPost } from '@/lib/posts';

// GET /api/posts?search=&tag=&page=&limit=  — published posts only
export const GET = handler(async (request) => {
  const params = request.nextUrl.searchParams;
  const result = await listPublishedPosts({
    search: params.get('search'),
    tag: params.get('tag'),
    page: params.get('page'),
    limit: params.get('limit'),
  });
  return json(result);
});

// POST /api/posts  — create; author is the authenticated user, never taken from the body
export const POST = handler(async (request) => {
  const user = await requireAuth(request);
  const body = await readJson(request);
  const post = await createPost(body, user._id);
  return json({ post: await getPostById(String(post._id)) }, 201);
});
