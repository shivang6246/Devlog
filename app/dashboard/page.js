'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { loginUrl } from '@/lib/redirect';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import ConfirmDialog from '@/components/ConfirmDialog';
import { primaryButton } from '@/components/ui';

const FILTERS = [
  ['all', 'All'],
  ['published', 'Published'],
  ['draft', 'Drafts'],
];

function StatusBadge({ status }) {
  const published = status === 'published';
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] ${
        published
          ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
          : 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30'
      }`}
    >
      {published ? 'Published' : 'Draft'}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setPosts(null);
    try {
      const data = await apiFetch('/api/posts/mine');
      setPosts(data.posts);
    } catch (err) {
      if (err.status === 401) return router.replace(loginUrl('/dashboard'));
      setError(err.message);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/posts/${pendingDelete._id}`, { method: 'DELETE' });
      setPosts((list) => list.filter((p) => p._id !== pendingDelete._id));
      setPendingDelete(null);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const counts = {
    all: posts?.length || 0,
    published: posts?.filter((p) => p.status === 'published').length || 0,
    draft: posts?.filter((p) => p.status === 'draft').length || 0,
  };
  const visible = posts?.filter((p) => filter === 'all' || p.status === filter) || [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-5xl leading-none text-white sm:text-6xl">Dashboard</h1>
          <p className="mt-3 text-sm text-slate-400">
            {user ? `Signed in as ${user.name}. ` : ''}Manage your drafts and published posts.
          </p>
        </div>
        <Link href="/editor/new" className={primaryButton}>
          + New post
        </Link>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-white/10" role="tablist">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-[11px] font-medium uppercase tracking-[0.22em] ${
              filter === key
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-500 hover:text-slate-200'
            }`}
          >
            {label}
            <span className="ml-2 font-display text-sm normal-case tracking-normal tabular-nums text-slate-500">
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {error && <div className="mb-4"><ErrorMessage message={error} onRetry={load} /></div>}

      {posts === null && !error ? (
        <LoadingSpinner label="Loading your posts…" />
      ) : posts && visible.length === 0 ? (
        <EmptyState
          title={filter === 'draft' ? 'No drafts' : filter === 'published' ? 'Nothing published yet' : 'You haven’t written anything yet'}
          message="Start a new post — it’s saved as a draft until you publish it."
          action={<Link href="/editor/new" className={primaryButton}>Write your first post</Link>}
        />
      ) : (
        <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-surface">
          {visible.map((post) => (
            <li key={post._id} className="flex flex-col gap-4 p-5 transition hover:bg-surface shadow-surface sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusBadge status={post.status} />
                  <span className="text-xs text-slate-500">
                    {post.status === 'published'
                      ? `Published ${formatDate(post.publishedAt)}`
                      : `Edited ${formatDate(post.updatedAt)}`}
                  </span>
                </div>
                <p className="mt-2 truncate font-display text-2xl text-white">
                  {post.status === 'published' ? (
                    <Link href={`/post/${post.slug}`} className="link-sweep">
                      {post.title}
                    </Link>
                  ) : (
                    <Link href={`/editor/${post._id}`} className="link-sweep">
                      {post.title}
                    </Link>
                  )}
                </p>
                {post.tags?.length > 0 && (
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {post.tags.map((t) => `#${t.name}`).join('  ')}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/editor/${post._id}`}
                  className="rounded-full border border-white/15 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/40 hover:text-white"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => setPendingDelete(post)}
                  className="rounded-full border border-red-500/30 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300 transition hover:border-red-400 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this post?"
        message={pendingDelete ? `“${pendingDelete.title}” will be permanently deleted. This can’t be undone.` : ''}
        confirmLabel="Delete post"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
