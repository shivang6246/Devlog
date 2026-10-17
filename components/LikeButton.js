'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { loginUrl } from '@/lib/redirect';
import { useAuth } from '@/context/AuthContext';

export function HeartIcon({ filled = false, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
      <path strokeLinejoin="round" d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.9 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.8 1.1-1.7 2.7-2.8 4.7-2.8 3.4 0 5.7 3.3 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3Z" />
    </svg>
  );
}

/** Optimistic like toggle. Logged-out visitors are sent to log in and come back. */
export default function LikeButton({ postId, returnTo, initialLiked = false, initialCount = 0 }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(0); // re-triggers the pop animation

  async function toggle() {
    if (!loading && !user) {
      router.push(loginUrl(returnTo));
      return;
    }
    if (busy) return;

    const nextLiked = !liked;
    const prev = { liked, count };
    setLiked(nextLiked);
    setCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    if (nextLiked) setBurst((b) => b + 1);
    setBusy(true);
    try {
      const data = await apiFetch(`/api/posts/${postId}/like`, { method: nextLiked ? 'POST' : 'DELETE' });
      setLiked(data.liked);
      setCount(data.likeCount);
    } catch (err) {
      setLiked(prev.liked);
      setCount(prev.count);
      if (err.status === 401) router.push(loginUrl(returnTo));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike this post' : 'Like this post'}
      className={`group relative inline-flex items-center gap-2.5 rounded-full py-2 pl-3 pr-4 ring-1 transition ${
        liked
          ? 'text-red-400 ring-red-400/40 shadow-[0_0_24px_rgb(248_113_113/0.25)]'
          : 'text-slate-300 ring-white/15 hover:text-white hover:ring-white/40'
      }`}
    >
      <span className="relative flex">
        <span key={burst} className={burst ? 'like-pop flex' : 'flex'}>
          <HeartIcon filled={liked} />
        </span>
        {burst > 0 && liked && <span key={`r${burst}`} aria-hidden="true" className="like-ring absolute inset-0 rounded-full" />}
      </span>
      <span className="font-display text-lg tabular-nums leading-none">{count}</span>
      <span className="sr-only">{count === 1 ? 'like' : 'likes'}</span>
    </button>
  );
}
