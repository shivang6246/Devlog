import { handler, json, notFound } from '@/lib/api';
import { getTagWithPosts } from '@/lib/data';

// GET /api/tags/:slug/posts — published posts with this tag
export const GET = handler(async (request, { params }) => {
  const { slug } = await params;
  const sp = request.nextUrl.searchParams;
  const result = await getTagWithPosts(slug, { page: sp.get('page'), limit: sp.get('limit') });
  if (!result) throw notFound('Tag not found');
  return json(result);
});
