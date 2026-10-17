/** Write-side post logic shared by POST /api/posts and PUT /api/posts/[id]. */
import { sql } from './db';
import { badRequest, validateUrl } from './api';
import { escapeRegex, slugify } from './slug';
import { upsertTags } from './tags';
import { excerptFromMarkdown } from './excerpt';

const STATUSES = ['draft', 'published'];
const MAX_CONTENT = 100_000;

/**
 * Validates the client-editable fields. Anything else in the body (author,
 * slug, publishedAt, _id…) is ignored, so it cannot be mass-assigned.
 */
function parseFields(body, { partial }) {
  const out = {};

  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) throw badRequest('Title is required');
    if (body.title.trim().length > 150) throw badRequest('Title must be at most 150 characters');
    out.title = body.title.trim();
  }
  if (body.content !== undefined) {
    if (typeof body.content !== 'string') throw badRequest('Content must be a string');
    if (body.content.length > MAX_CONTENT) throw badRequest('Content must be at most 100,000 characters');
    out.content = body.content;
  }
  if (body.excerpt !== undefined) {
    if (typeof body.excerpt !== 'string') throw badRequest('Excerpt must be a string');
    if (body.excerpt.trim().length > 250) throw badRequest('Excerpt must be at most 250 characters');
    out.excerpt = body.excerpt.trim();
  }
  if (body.coverImage !== undefined) out.coverImage = validateUrl(body.coverImage, 'Cover image');
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw badRequest('Status must be "draft" or "published"');
    out.status = body.status;
  }
  if (body.tags !== undefined) out.tags = body.tags; // validated in upsertTags
  return out;
}

/** Returns `base`, or `base-2`, `base-3`, … — the first slug no other post uses. */
async function uniqueSlug(base, excludeId = null) {
  const rows = await sql`
    select slug from posts
    where slug ~ ${`^${escapeRegex(base)}(-[0-9]+)?$`}
    ${excludeId ? sql`and id <> ${excludeId}` : sql``}`;
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Runs `write()`, picking a fresh slug and retrying if a concurrent request grabbed it first. */
async function withUniqueSlug(post, base, write) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await write();
    } catch (err) {
      const slugClash = err?.code === '23505' && err.constraint_name === 'posts_slug_key';
      if (!slugClash || attempt >= 2) throw err;
      post.slug = await uniqueSlug(base, post._id);
    }
  }
}

function finalize(post) {
  if (!post.excerpt) post.excerpt = excerptFromMarkdown(post.content);
  if (post.status === 'published') {
    if (!post.content.trim()) throw badRequest('Content is required to publish a post');
    if (!post.publishedAt) post.publishedAt = new Date();
  }
}

async function replaceTags(tx, postId, tagIds) {
  await tx`delete from post_tags where post_id = ${postId}`;
  if (tagIds.length) {
    const rows = tagIds.map((tagId, position) => ({ post_id: postId, tag_id: tagId, position }));
    await tx`insert into post_tags ${tx(rows)}`;
  }
}

export async function createPost(body, authorId) {
  const fields = parseFields(body, { partial: false });
  const tagIds = await upsertTags(fields.tags);

  const base = slugify(fields.title);
  const post = {
    _id: null,
    title: fields.title,
    content: fields.content ?? '',
    excerpt: fields.excerpt ?? '',
    coverImage: fields.coverImage ?? '',
    status: fields.status ?? 'draft',
    publishedAt: null,
    slug: await uniqueSlug(base),
  };
  finalize(post);

  return withUniqueSlug(post, base, () =>
    sql.begin(async (tx) => {
      const [row] = await tx`
        insert into posts (title, slug, content, excerpt, cover_image, status, published_at, author_id)
        values (${post.title}, ${post.slug}, ${post.content}, ${post.excerpt}, ${post.coverImage},
                ${post.status}, ${post.publishedAt}, ${authorId})
        returning id as _id`;
      await replaceTags(tx, row._id, tagIds);
      return row;
    })
  );
}

/** `post` must already be ownership-checked by the caller. */
export async function updatePost(post, body) {
  const fields = parseFields(body, { partial: true });

  const tagIds = fields.tags !== undefined ? await upsertTags(fields.tags) : null;
  for (const key of ['title', 'content', 'excerpt', 'coverImage', 'status']) {
    if (fields[key] !== undefined) post[key] = fields[key];
  }

  // Slugs follow the title until first publish; after that, links must stay stable.
  let base = post.slug;
  if (fields.title !== undefined && !post.publishedAt) {
    base = slugify(fields.title);
    const suffix = post.slug.startsWith(base) ? post.slug.slice(base.length) : null;
    if (suffix === null || !/^(-\d+)?$/.test(suffix)) {
      post.slug = await uniqueSlug(base, post._id);
    }
  }

  finalize(post);
  return withUniqueSlug(post, base, () =>
    sql.begin(async (tx) => {
      await tx`
        update posts set
          title = ${post.title}, slug = ${post.slug}, content = ${post.content},
          excerpt = ${post.excerpt}, cover_image = ${post.coverImage}, status = ${post.status},
          published_at = ${post.publishedAt}, updated_at = now()
        where id = ${post._id}`;
      if (tagIds) await replaceTags(tx, post._id, tagIds);
      return post;
    })
  );
}
