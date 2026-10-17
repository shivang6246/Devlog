import LikeButton from './LikeButton';
import ShareButton from './ShareButton';

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5" aria-hidden="true">
      <path strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5v-8Z" />
    </svg>
  );
}

/** Like · responses · share bar for a post (server wrapper around the client buttons). */
export default function PostActions({ post, liked, className = '' }) {
  const path = `/post/${post.slug}`;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-y border-white/10 py-4 ${className}`}>
      <div className="flex items-center gap-3">
        <LikeButton postId={post._id} returnTo={path} initialLiked={liked} initialCount={post.likeCount || 0} />
        <a
          href="#comments"
          className="inline-flex items-center gap-2.5 rounded-full py-2 pl-3 pr-4 text-slate-300 ring-1 ring-white/15 transition hover:text-white hover:ring-white/40"
          aria-label={`${post.commentCount || 0} responses — jump to comments`}
        >
          <CommentIcon />
          <span className="font-display text-lg tabular-nums leading-none">{post.commentCount || 0}</span>
        </a>
      </div>
      <ShareButton title={post.title} text={post.excerpt} path={path} />
    </div>
  );
}
