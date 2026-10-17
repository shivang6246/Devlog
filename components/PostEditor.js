'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { loginUrl } from '@/lib/redirect';
import MarkdownEditor from './MarkdownEditor';
import TagInput from './TagInput';
import ErrorMessage from './ErrorMessage';
import { Spinner, inputClass, labelClass, primaryButton, secondaryButton } from './ui';

function toForm(post) {
  return {
    title: post?.title || '',
    content: post?.content || '',
    excerpt: post?.excerpt || '',
    coverImage: post?.coverImage || '',
    tags: post?.tags?.map((t) => t.name) || [],
  };
}

export default function PostEditor({ initialPost = null }) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost); // last saved server copy
  const [form, setForm] = useState(() => toForm(initialPost));
  const [saved, setSaved] = useState(() => JSON.stringify(toForm(initialPost)));
  const [saving, setSaving] = useState(null); // 'draft' | 'published' | null
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showMeta, setShowMeta] = useState(Boolean(initialPost?.coverImage || initialPost?.excerpt));

  const dirty = useMemo(() => JSON.stringify(form) !== saved, [form, saved]);
  const isPublished = post?.status === 'published';

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  async function save(status) {
    setError('');
    setNotice('');
    if (!form.title.trim()) return setError('Give your post a title.');
    if (status === 'published' && !form.content.trim()) {
      return setError('Write some content before publishing.');
    }

    setSaving(status);
    try {
      const body = { ...form, status };
      const data = post
        ? await apiFetch(`/api/posts/${post._id}`, { method: 'PUT', body })
        : await apiFetch('/api/posts', { method: 'POST', body });

      const next = data.post;
      const nextForm = toForm(next);
      setPost(next);
      setForm(nextForm);
      setSaved(JSON.stringify(nextForm));

      if (status === 'published') {
        router.push(`/post/${next.slug}`);
        router.refresh();
        return;
      }
      setNotice(`Draft saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      if (!post) router.replace(`/editor/${next._id}`, { scroll: false });
    } catch (err) {
      if (err.status === 401) {
        router.replace(loginUrl(post ? `/editor/${post._id}` : '/editor/new'));
        return;
      }
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  const busy = saving !== null;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/dashboard" className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500 transition hover:text-white">
            ← Dashboard
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="whitespace-nowrap font-display text-3xl text-white">{post ? 'Edit post' : 'New post'}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] ${
                isPublished
                  ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30'
              }`}
            >
              {isPublished ? 'Published' : 'Draft'}
            </span>
            {dirty && <span className="text-xs text-slate-500">· Unsaved changes</span>}
          </div>
        </div>

        {/* Full-width, evenly split buttons on phones; inline on larger screens. */}
        <div className="flex gap-2 *:flex-1 sm:*:flex-none">
          {isPublished && (
            <Link href={`/post/${post.slug}`} className={secondaryButton}>
              View
            </Link>
          )}
          <button type="button" disabled={busy} onClick={() => save('draft')} className={secondaryButton}>
            {saving === 'draft' && <Spinner />}
            {isPublished ? 'Unpublish' : 'Save draft'}
          </button>
          <button type="button" disabled={busy} onClick={() => save('published')} className={primaryButton}>
            {saving === 'published' && <Spinner />}
            {isPublished ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {error && <ErrorMessage title="Couldn't save" message={error} />}
        {notice && (
          <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] px-4 py-2.5 text-sm text-emerald-200">
            {notice}
          </p>
        )}

        <div>
          <label htmlFor="title" className="sr-only">Title</label>
          {/* A textarea (not an input) so long titles wrap on narrow screens; Enter is blocked
              so it still behaves like a single-line field. `field-sizing` makes it auto-grow. */}
          <textarea
            id="title"
            rows={1}
            value={form.title}
            onChange={(e) => set('title')(e.target.value.replace(/\s*\n\s*/g, ' '))}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            maxLength={150}
            placeholder="Post title"
            className="block min-h-[1.2em] w-full resize-none overflow-hidden bg-transparent font-display text-[2.1rem] leading-tight text-white outline-none [field-sizing:content] placeholder:text-slate-700 min-[400px]:text-4xl sm:text-5xl lg:text-6xl"
          />
        </div>

        <div>
          <label htmlFor="tags" className={labelClass}>Tags</label>
          <TagInput value={form.tags} onChange={set('tags')} />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowMeta((s) => !s)}
            aria-expanded={showMeta}
            className="text-sm font-medium text-slate-400 hover:text-white"
          >
            {showMeta ? '▾' : '▸'} Cover image &amp; excerpt
          </button>
          {showMeta && (
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="coverImage" className={labelClass}>Cover image URL</label>
                <input
                  id="coverImage"
                  type="url"
                  inputMode="url"
                  value={form.coverImage}
                  onChange={(e) => set('coverImage')(e.target.value)}
                  placeholder="https://…"
                  className={inputClass}
                />
                {/^https?:\/\//.test(form.coverImage) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.coverImage} alt="Cover preview" className="mt-2 aspect-[2/1] w-full rounded-lg bg-slate-800 object-cover" />
                )}
              </div>
              <div>
                <label htmlFor="excerpt" className={labelClass}>Excerpt</label>
                <textarea
                  id="excerpt"
                  rows={4}
                  maxLength={250}
                  value={form.excerpt}
                  onChange={(e) => set('excerpt')(e.target.value)}
                  placeholder="Leave empty to generate one from your content."
                  className={inputClass}
                />
                <p className="mt-1 text-right text-xs tabular-nums text-slate-500">{form.excerpt.length}/250</p>
              </div>
            </div>
          )}
        </div>

        <MarkdownEditor value={form.content} onChange={set('content')} />
      </div>
    </div>
  );
}
