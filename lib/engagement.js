/**
 * Likes and comments. Only *published* posts can be liked or commented on —
 * a draft id behaves exactly like a missing post (404), so drafts never leak.
 *
 * Each write changes the row AND the post's counter in one statement
 * (a data-modifying CTE), so the counters can't drift. Deleting a post
 * removes its likes and comments through ON DELETE CASCADE.
 */
import { sql } from './db';
import { HttpError, badRequest, forbidden, isValidId, notFound } from './api';
import { bumpContentVersion } from './cache';

const MAX_COMMENT = 2000;
const COMMENT_COOLDOWN_MS = 3000;

const toPlain = (value) => JSON.parse(JSON.stringify(value));

// Explicit allow-list for the embedded comment author: never email/password. Needs `users u`.
const commentAuthorJson = () => sql`json_build_object('_id', u.id, 'name', u.name, 'avatarUrl', u.avatar_url)`;

async function findPublishedPost(postId) {
  if (!isValidId(postId)) throw notFound('Post not found');
  const [post] = await sql`select id as _id, author_id from posts where id = ${postId} and status = 'published'`;
  if (!post) throw notFound('Post not found');
  return post;
}

// ---------- Likes ----------

export async function getLikeState(postId, userId) {
  if (!isValidId(postId)) return { liked: false, likeCount: 0 };
  const [[post], [liked]] = await Promise.all([
    sql`select like_count from posts where id = ${postId}`,
    userId ? sql`select 1 from likes where post_id = ${postId} and user_id = ${userId}` : [],
  ]);
  return { liked: Boolean(liked), likeCount: post?.likeCount ?? 0 };
}

/** Idempotent: liking twice is a no-op (primary key on post+user). */
export async function likePost(postId, userId) {
  const post = await findPublishedPost(postId);
  const { count } = await sql`
    with ins as (
      insert into likes (post_id, user_id) values (${post._id}, ${userId})
      on conflict do nothing
      returning post_id
    )
    update posts set like_count = like_count + 1 where id in (select post_id from ins)`;
  if (count) await bumpContentVersion(); // a repeated like changes nothing
  return getLikeState(post._id, userId);
}

/** Idempotent: unliking a post you haven't liked is a no-op. */
export async function unlikePost(postId, userId) {
  const post = await findPublishedPost(postId);
  const { count } = await sql`
    with del as (
      delete from likes where post_id = ${post._id} and user_id = ${userId}
      returning post_id
    )
    update posts set like_count = like_count - 1
    where id in (select post_id from del) and like_count > 0`;
  if (count) await bumpContentVersion();
  return getLikeState(post._id, userId);
}

export async function publishedPostLikeState(postId, userId) {
  const post = await findPublishedPost(postId);
  return getLikeState(post._id, userId);
}

// ---------- Comments ----------

export async function listComments(postId, { page, limit } = {}) {
  const post = await findPublishedPost(postId);
  const p = Math.max(1, Number.parseInt(page, 10) || 1);
  const l = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));

  const [comments, [{ total }]] = await Promise.all([
    sql`
      select c.id as _id, c.post_id as post, c.content, c.created_at, c.updated_at,
             ${commentAuthorJson()} as author
      from comments c join users u on u.id = c.author_id
      where c.post_id = ${post._id}
      order by c.created_at asc, c.id asc
      limit ${l} offset ${(p - 1) * l}`,
    sql`select count(*)::int as total from comments where post_id = ${post._id}`,
  ]);

  return {
    comments: toPlain(comments),
    pagination: { page: p, limit: l, total, pages: Math.max(1, Math.ceil(total / l)) },
  };
}

export async function addComment(postId, userId, content) {
  if (typeof content !== 'string') throw badRequest('Comment must be text');
  const text = content.replace(/\r\n?/g, '\n').trim();
  if (!text) throw badRequest('Comment cannot be empty');
  if (text.length > MAX_COMMENT) throw badRequest(`Comments must be at most ${MAX_COMMENT.toLocaleString('en-US')} characters`);

  const post = await findPublishedPost(postId);

  // Light flood protection: one comment per user every few seconds.
  // The insert only happens if this user has no comment newer than the cooldown.
  const [comment] = await sql`
    with ins as (
      insert into comments (post_id, author_id, content)
      select ${post._id}, ${userId}, ${text}
      where not exists (
        select 1 from comments
        where author_id = ${userId}
          and created_at > now() - ${COMMENT_COOLDOWN_MS}::int * interval '1 millisecond'
      )
      returning *
    ), bump as (
      update posts set comment_count = comment_count + 1 where id in (select post_id from ins)
    )
    select ins.id as _id, ins.post_id as post, ins.content, ins.created_at, ins.updated_at,
           ${commentAuthorJson()} as author
    from ins join users u on u.id = ins.author_id`;
  if (!comment) throw new HttpError(429, 'You’re commenting too fast. Please wait a moment.');
  await bumpContentVersion(); // commentCount is shown on cached pages
  return toPlain(comment);
}

/** The comment's author or the post's author may delete it. Order: 404 → 403. */
export async function deleteComment(commentId, user) {
  if (!isValidId(commentId)) throw notFound('Comment not found');
  const [comment] = await sql`
    select c.id, c.post_id, c.author_id, p.author_id as post_author_id
    from comments c left join posts p on p.id = c.post_id
    where c.id = ${commentId}`;
  if (!comment) throw notFound('Comment not found');

  const isCommentAuthor = comment.authorId === user._id;
  const isPostAuthor = comment.postAuthorId === user._id;
  if (!isCommentAuthor && !isPostAuthor) {
    throw forbidden('You can only delete your own comments or comments on your posts');
  }

  await sql`
    with del as (delete from comments where id = ${comment.id} returning post_id)
    update posts set comment_count = comment_count - 1
    where id in (select post_id from del) and comment_count > 0`;
  await bumpContentVersion();
  return { id: comment.id, postId: comment.postId };
}
