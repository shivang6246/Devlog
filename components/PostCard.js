import Link from 'next/link';
import Avatar from './Avatar';
import TagPill from './TagPill';
import { formatDate } from '@/lib/format';

/** Editorial row: index · serif title + meta · cover image that warms up on hover. */
export default function PostCard({ post, index, showAuthor = true }) {
  const author = post.author;
  const date = post.publishedAt || post.createdAt;

  return (
    <article className="scroll-reveal group relative grid gap-5 border-t border-white/10 py-9 sm:py-11 md:grid-cols-[2.5rem_minmax(0,1fr)_11rem] md:gap-6 lg:grid-cols-[4rem_minmax(0,1fr)_16rem] lg:gap-8 2xl:grid-cols-[5rem_minmax(0,1fr)_22rem] 2xl:gap-12">
      {typeof index === 'number' && (
        <span className="font-display text-sm tabular-nums text-indigo-400 md:pt-2">
          {String(index).padStart(2, '0')}
        </span>
      )}

      <div className={`min-w-0 ${typeof index === 'number' ? '' : 'md:col-span-2'}`}>
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
          {showAuthor && author && (
            <>
              <Link href={`/profile/${author._id}`} className="relative z-10 flex items-center gap-2 text-slate-300 transition hover:text-white">
                <Avatar name={author.name} src={author.avatarUrl} size="xs" />
                {author.name}
              </Link>
              <span aria-hidden="true" className="h-px w-4 bg-white/20" />
            </>
          )}
          <time dateTime={date}>{formatDate(date)}</time>
          {(post.likeCount > 0 || post.commentCount > 0) && (
            <span className="flex items-center gap-3 normal-case tracking-normal">
              <span aria-hidden="true" className="h-px w-4 bg-white/20" />
              <span className="inline-flex items-center gap-1" title={`${post.likeCount || 0} likes`}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path strokeLinejoin="round" d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.9 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.8 1.1-1.7 2.7-2.8 4.7-2.8 3.4 0 5.7 3.3 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3Z" />
                </svg>
                <span className="text-[11px] tabular-nums">{post.likeCount || 0}</span>
                <span className="sr-only">likes</span>
              </span>
              <span className="inline-flex items-center gap-1" title={`${post.commentCount || 0} responses`}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5v-8Z" />
                </svg>
                <span className="text-[11px] tabular-nums">{post.commentCount || 0}</span>
                <span className="sr-only">responses</span>
              </span>
            </span>
          )}
        </div>

        <h2 className="font-display text-[1.6rem] leading-[1.15] text-white min-[400px]:text-[1.75rem] sm:text-[2.1rem] md:text-[1.9rem] lg:text-[2.1rem] 2xl:text-[2.6rem]">
          <Link href={`/post/${post.slug}`} className="link-sweep pb-0.5 after:absolute after:inset-0 after:content-['']">
            {post.title}
          </Link>
        </h2>

        {post.excerpt && (
          <p className="mt-3 line-clamp-3 max-w-2xl text-[15px] leading-relaxed text-slate-400">{post.excerpt}</p>
        )}

        {post.tags?.length > 0 && (
          <div className="relative z-10 mt-5 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <TagPill key={tag._id} tag={tag} />
            ))}
          </div>
        )}
      </div>

      {post.coverImage ? (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 md:mt-1 md:h-28 lg:h-40 2xl:h-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImage}
            alt=""
            loading="lazy"
            className="aspect-[2/1] h-full w-full object-cover opacity-80 grayscale transition light:opacity-100 duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 md:aspect-auto"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent light:hidden" />
        </div>
      ) : (
        <div aria-hidden="true" className="hidden items-start justify-end md:flex">
          <span className="mt-3 text-[10px] uppercase tracking-[0.3em] text-slate-600 transition group-hover:text-indigo-400">
            Read story →
          </span>
        </div>
      )}
    </article>
  );
}
