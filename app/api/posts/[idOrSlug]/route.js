/**
 * Next.js can't have sibling [slug] and [id] folders, so one dynamic segment
 * serves both documented routes:
 *   GET    /api/posts/:slug  — public, published only
 *   PUT    /api/posts/:id    — owner only
 *   DELETE /api/posts/:id    — owner only
 */
import { sql } from '@/lib/db';
import { forbidden, handler, isValidId, json, notFound, readJson } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { getPostById, getPublishedPostBySlug } from '@/lib/data';
import { updatePost } from '@/lib/posts';

export const GET = handler(async (_request, { params }) => {
  const { idOrSlug } = await params;
  const post = await getPublishedPostBySlug(idOrSlug);
  if (!post) throw notFound('Post not found');
  return json({ post });
});

/** Authenticates, loads the post, and enforces ownership: 401 → 404 → 403. */
async function loadOwnedPost(request, params) {
  const user = await requireAuth(request);
  const { idOrSlug: id } = await params;
  if (!isValidId(id)) throw notFound('Post not found');

  const [post] = await sql`
    select id as _id, author_id, title, slug, content, excerpt, cover_image, status, published_at
    from posts where id = ${id}`;
  if (!post) throw notFound('Post not found');
  if (post.authorId !== user._id) throw forbidden('You can only modify your own posts');
  return post;
}

export const PUT = handler(async (request, { params }) => {
  const post = await loadOwnedPost(request, params);
  const body = await readJson(request);
  await updatePost(post, body);
  return json({ post: await getPostById(post._id) });
});

// Its likes, comments and tag links go with it (ON DELETE CASCADE).
export const DELETE = handler(async (request, { params }) => {
  const post = await loadOwnedPost(request, params);
  await sql`delete from posts where id = ${post._id}`;
  return json({ message: 'Post deleted', id: post._id });
});
