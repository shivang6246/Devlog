/**
 * Read-side data functions. Used directly by Server Components AND by the
 * /api route handlers, so the draft filtering below applies to both.
 *
 * Every *public* function hard-codes `status = 'published'`.
 * Rows keep the original API shape: `_id`, camelCase fields, an embedded
 * `author` object and a `tags` array.
 */
import { sql } from './db';
import { isValidId } from './api';
import { readingTime } from './excerpt';

const PUBLISHED = 'published';
const MAX_LIMIT = 50;

/** Rows -> plain JSON (Dates become ISO strings) safe to pass to Client Components. */
function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Escapes % _ and \ so a search term matches literally inside ILIKE. */
function escapeLike(str) {
  return str.replace(/[\\%_]/g, '\\$&');
}

// Every post column except `content` (list views don't need the body).
const listColumns = () => sql`
  p.id as _id, p.title, p.slug, p.excerpt, p.cover_image, p.status, p.published_at,
  p.like_count, p.comment_count, p.created_at, p.updated_at`;

// Explicit allow-list for the embedded author: never email/password. Needs `users u`.
const authorJson = () =>
  sql`json_build_object('_id', u.id, 'name', u.name, 'avatarUrl', u.avatar_url, 'bio', u.bio)`;

// The post's tags in the order the author entered them. Needs `posts p`.
const tagsJson = () => sql`coalesce((
    select json_agg(json_build_object('_id', t.id, 'name', t.name, 'slug', t.slug) order by pt.position)
    from post_tags pt join tags t on t.id = pt.tag_id
    where pt.post_id = p.id
  ), '[]'::json)`;

function pageParams({ page, limit } = {}) {
  const p = Math.max(1, Number.parseInt(page, 10) || 1);
  const l = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || 10));
  return { page: p, limit: l, offset: (p - 1) * l };
}

/** `where` returns an extra `and …` fragment (or sql``) on top of the published filter. */
async function findPublishedPage(where, paging) {
  const { page, limit, offset } = pageParams(paging);
  const [posts, [{ total }]] = await Promise.all([
    sql`
      select ${listColumns()}, ${authorJson()} as author, ${tagsJson()} as tags
      from posts p join users u on u.id = p.author_id
      where p.status = ${PUBLISHED} ${where()}
      order by p.published_at desc, p.id desc
      limit ${limit} offset ${offset}`,
    sql`select count(*)::int as total from posts p where p.status = ${PUBLISHED} ${where()}`,
  ]);
  return {
    posts: toPlain(posts),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

const emptyPage = (paging) => {
  const { page, limit } = pageParams(paging);
  return { posts: [], pagination: { page, limit, total: 0, pages: 1 } };
};

/** Public feed. `search` matches titles (case-insensitive), `tag` is a tag slug or name. */
export async function listPublishedPosts({ search, tag, page, limit } = {}) {
  const term = typeof search === 'string' ? search.trim().slice(0, 100) : '';

  let tagId = null;
  if (typeof tag === 'string' && tag.trim()) {
    const key = tag.trim().toLowerCase();
    const [found] = await sql`select id from tags where slug = ${key} or name = ${key} limit 1`;
    if (!found) return emptyPage({ page, limit });
    tagId = found.id;
  }

  return findPublishedPage(
    () => sql`
      ${term ? sql`and p.title ilike ${`%${escapeLike(term)}%`}` : sql``}
      ${tagId ? sql`and exists (select 1 from post_tags pt where pt.post_id = p.id and pt.tag_id = ${tagId})` : sql``}`,
    { page, limit }
  );
}

export async function getPublishedPostBySlug(slug) {
  if (typeof slug !== 'string' || !slug) return null;
  const [post] = await sql`
    select ${listColumns()}, p.content, ${authorJson()} as author, ${tagsJson()} as tags
    from posts p join users u on u.id = p.author_id
    where p.slug = ${slug.toLowerCase()} and p.status = ${PUBLISHED}`;
  if (!post) return null;
  return toPlain({ ...post, readingTime: readingTime(post.content) });
}

export async function listTagsWithCounts() {
  const tags = await sql`
    select t.id as _id, t.name, t.slug, count(p.id)::int as post_count
    from tags t
    left join post_tags pt on pt.tag_id = t.id
    left join posts p on p.id = pt.post_id and p.status = ${PUBLISHED}
    group by t.id
    order by post_count desc, t.name asc`;
  return toPlain(tags);
}

export async function getTagWithPosts(slug, paging) {
  if (typeof slug !== 'string' || !slug) return null;
  const [tag] = await sql`select id as _id, name, slug from tags where slug = ${slug.toLowerCase()}`;
  if (!tag) return null;
  const result = await findPublishedPage(
    () => sql`and exists (select 1 from post_tags pt where pt.post_id = p.id and pt.tag_id = ${tag._id})`,
    paging
  );
  return { tag: toPlain({ ...tag, postCount: result.pagination.total }), ...result };
}

/** Public profile: no email, and only published posts. */
export async function getUserProfile(id, paging = { limit: MAX_LIMIT }) {
  if (!isValidId(id)) return null;
  const [user] = await sql`select id as _id, name, bio, avatar_url, created_at from users where id = ${id}`;
  if (!user) return null;
  const result = await findPublishedPage(() => sql`and p.author_id = ${user._id}`, paging);
  return { user: toPlain(user), ...result };
}

/** Counts for the home hero: published stories, topics in use, and authors who've published. */
export async function getSiteStats() {
  const [[{ stories, authors }], [{ topics }]] = await Promise.all([
    sql`
      select count(*)::int as stories, count(distinct author_id)::int as authors
      from posts where status = ${PUBLISHED}`,
    sql`
      select count(distinct pt.tag_id)::int as topics
      from post_tags pt join posts p on p.id = pt.post_id
      where p.status = ${PUBLISHED}`,
  ]);
  return { stories, authors, topics };
}

/** The signed-in author's own posts, drafts included. */
export async function listPostsByAuthor(userId) {
  const posts = await sql`
    select ${listColumns()}, p.author_id as author, ${tagsJson()} as tags
    from posts p
    where p.author_id = ${userId}
    order by p.updated_at desc`;
  return toPlain(posts);
}

/** Any post by id regardless of status. Callers must enforce ownership. */
export async function getPostById(id) {
  if (!isValidId(id)) return null;
  const [post] = await sql`
    select ${listColumns()}, p.content, ${authorJson()} as author, ${tagsJson()} as tags
    from posts p join users u on u.id = p.author_id
    where p.id = ${id}`;
  return post ? toPlain(post) : null;
}
