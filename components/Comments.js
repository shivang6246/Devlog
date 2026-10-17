'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { loginUrl } from '@/lib/redirect';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import Avatar from './Avatar';
import ConfirmDialog from './ConfirmDialog';
import ErrorMessage from './ErrorMessage';
import { Eyebrow } from './design';
import { Spinner, inputClass, primaryButton, secondaryButton } from './ui';

const MAX = 2000;

function CommentItem({ comment, canDelete, onDelete, isPostAuthor }) {
  const author = comment.author;
  return (
    <li id={`comment-${comment._id}`} className="scroll-mt-28 border-t border-white/10 py-6">
      <div className="flex items-start gap-4">
        <Avatar name={author?.name} src={author?.avatarUrl} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {author ? (
              <Link href={`/profile/${author._id}`} className="font-display text-lg text-white link-sweep">
                {author.name}
              </Link>
            ) : (
              <span className="font-display text-lg text-slate-400">Deleted user</span>
            )}
            {isPostAuthor && (
              <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-indigo-300 ring-1 ring-indigo-500/40">
                Author
              </span>
            )}
            <time dateTime={comment.createdAt} className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">
              {formatDate(comment.createdAt)}
            </time>
          </div>
          {/* Plain text only: React escapes it, and whitespace-pre-wrap keeps line breaks. */}
          <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-300">
            {comment.content}
          </p>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(comment)}
              className="mt-3 text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500 transition hover:text-red-400"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Discussion under a post. Initial comments are server-rendered (passed in),
 * so they're indexable and there's no loading flash.
 */
export default function Comments({ postId, postSlug, postAuthorId, initialComments, initialPagination }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [pagination, setPagination] = useState(initialPagination);
  const [total, setTotal] = useState(initialPagination.total);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const textareaRef = useRef(null);

  const returnTo = `/post/${postSlug}#comments`;
  const hasMore = pagination.page < pagination.pages;

  async function submit(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return setError('Write something first.');
    setPosting(true);
    setError('');
    try {
      const { comment } = await apiFetch(`/api/posts/${postId}/comments`, { method: 'POST', body: { content } });
      setText('');
      setTotal((t) => t + 1);
      router.refresh(); // keep the server-rendered response count in the action bar in sync
      // Oldest-first list: only append if every earlier page is already loaded.
      if (!hasMore) setComments((list) => [...list, comment]);
      requestAnimationFrame(() =>
        document.getElementById(`comment-${comment._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      );
    } catch (err) {
      if (err.status === 401) return router.push(loginUrl(returnTo));
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await apiFetch(`/api/posts/${postId}/comments?page=${pagination.page + 1}`);
      setComments((list) => {
        const seen = new Set(list.map((c) => c._id));
        return [...list, ...data.comments.filter((c) => !seen.has(c._id))];
      });
      setPagination(data.pagination);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/comments/${pendingDelete._id}`, { method: 'DELETE' });
      setComments((list) => list.filter((c) => c._id !== pendingDelete._id));
      setTotal((t) => Math.max(0, t - 1));
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  const isPostAuthorViewing = user && user._id === postAuthorId;

  return (
    <section id="comments" aria-labelledby="comments-heading" className="scroll-mt-24">
      <Eyebrow className="mb-4">Discussion</Eyebrow>
      <h2 id="comments-heading" className="font-display text-4xl text-white">
        {total} {total === 1 ? 'response' : 'responses'}
      </h2>

      <div className="mt-8">
        {loading ? null : user ? (
          <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-surface shadow-surface p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Avatar name={user.name} src={user.avatarUrl} size="sm" className="mt-1" />
              <div className="min-w-0 flex-1">
                <label htmlFor="comment" className="sr-only">Add a comment</label>
                <textarea
                  id="comment"
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
                  }}
                  rows={3}
                  placeholder="Share your thoughts…"
                  className={`${inputClass} min-h-24 resize-y [field-sizing:content]`}
                />
                {error && <div className="mt-3"><ErrorMessage title="Couldn't post comment" message={error} /></div>}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className={`text-xs tabular-nums ${text.length > MAX * 0.9 ? 'text-amber-300' : 'text-slate-500'}`}>
                    {text.length}/{MAX}
                  </span>
                  <button type="submit" disabled={posting || !text.trim()} className={primaryButton}>
                    {posting && <Spinner />} Respond
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-surface shadow-surface p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">Join the discussion — log in to like and respond.</p>
            <div className="flex gap-2">
              <Link href={loginUrl(returnTo)} className={secondaryButton}>Log in</Link>
              <Link href={`/register?from=${encodeURIComponent(returnTo)}`} className={primaryButton}>Sign up</Link>
            </div>
          </div>
        )}
      </div>

      {comments.length === 0 ? (
        <p className="mt-10 font-display text-xl italic text-slate-500">No responses yet. Start the conversation.</p>
      ) : (
        <ul className="mt-8 border-b border-white/10">
          {comments.map((c) => (
            <CommentItem
              key={c._id}
              comment={c}
              isPostAuthor={c.author?._id === postAuthorId}
              canDelete={Boolean(user && (c.author?._id === user._id || isPostAuthorViewing))}
              onDelete={setPendingDelete}
            />
          ))}
        </ul>
      )}

      {hasMore && (
        <button type="button" onClick={loadMore} disabled={loadingMore} className={`${secondaryButton} mt-6`}>
          {loadingMore && <Spinner />} Show more responses
        </button>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this comment?"
        message="It will be removed for everyone. This can’t be undone."
        confirmLabel="Delete comment"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
