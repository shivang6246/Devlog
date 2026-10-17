import { handler, json, readJson } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { addComment, listComments } from '@/lib/engagement';

// GET /api/posts/:id/comments?page=&limit= — public, oldest first, published posts only
export const GET = handler(async (request, { params }) => {
  const { idOrSlug: id } = await params;
  const sp = request.nextUrl.searchParams;
  return json(await listComments(id, { page: sp.get('page'), limit: sp.get('limit') }));
});

// POST /api/posts/:id/comments { content } — protected
export const POST = handler(async (request, { params }) => {
  const user = await requireAuth(request);
  const { idOrSlug: id } = await params;
  const { content } = await readJson(request);
  return json({ comment: await addComment(id, user._id, content) }, 201);
});
