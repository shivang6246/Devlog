import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getPublishedPostBySlug } from '@/lib/data';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import TagPill from '@/components/TagPill';
import Avatar from '@/components/Avatar';
import { Eclipse, Eyebrow, RevealText, SpecSheet } from '@/components/design';
import { formatDate } from '@/lib/format';
import { getSessionUser } from '@/lib/auth';
import { getLikeState, listComments } from '@/lib/engagement';
import PostActions from '@/components/PostActions';
import Comments from '@/components/Comments';

export const dynamic = 'force-dynamic';

// Dedupe the query between generateMetadata and the page render.
const getPost = cache((slug) => getPublishedPostBySlug(slug));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Post not found' };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/post/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt,
      authors: [post.author?.name].filter(Boolean),
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const { author } = post;
  const viewer = await getSessionUser();
  const [{ liked }, discussion] = await Promise.all([
    getLikeState(post._id, viewer?._id),
    listComments(post._id, { page: 1, limit: 20 }),
  ]);

  return (
    <article>
      <header className="relative mb-12">
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-600/15 blur-[100px] haze sm:h-96 sm:w-96" />
        <Link href="/" className="fade-in text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500 transition hover:text-white">
          ← All stories
        </Link>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-end">
          <div className="min-w-0">
            {post.tags?.length > 0 && (
              <div className="fade-in mb-6 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <TagPill key={tag._id} tag={tag} />
                ))}
              </div>
            )}
            <RevealText
              as="h1"
              text={post.title}
              className="max-w-5xl font-display text-[2.6rem] leading-[1.02] tracking-tight text-white text-balance sm:text-6xl lg:text-7xl 2xl:text-8xl"
            />
          </div>
          {!post.coverImage && <Eclipse className="hidden w-56 lg:block" />}
        </div>

        <div className="fade-in mt-10" style={{ '--d': '500ms' }}>
          <SpecSheet
            items={[
              {
                label: 'Written by',
                value: author ? (
                  <Link href={`/profile/${author._id}`} className="link-sweep">{author.name}</Link>
                ) : (
                  'Unknown'
                ),
              },
              { label: 'Published', value: formatDate(post.publishedAt || post.createdAt) },
              { label: 'Reading time', value: `${post.readingTime} min` },
            ]}
          />
        </div>
      </header>

      {post.coverImage && (
        <figure className="fade-in relative mb-14 overflow-hidden rounded-2xl border border-white/10 shadow-[0_30px_120px_-40px_rgb(45_82_255/0.6)]" style={{ '--d': '700ms' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverImage} alt="" className="aspect-[21/9] max-h-[70vh] w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent light:hidden" />
        </figure>
      )}

      <div className="mx-auto max-w-3xl 2xl:max-w-4xl">
        <MarkdownRenderer content={post.content} className="sm:prose-lg" />

        <PostActions post={post} liked={liked} className="mt-16" />

        {author && (
          <footer className="relative mt-20 overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-surface p-6 sm:p-8">
            <Eyebrow className="mb-5">Written by</Eyebrow>
            <div className="flex items-start gap-5">
              <Avatar name={author.name} src={author.avatarUrl} size="md" />
              <div className="min-w-0">
                <Link href={`/profile/${author._id}`} className="font-display text-3xl text-white link-sweep">
                  {author.name}
                </Link>
                {author.bio && <p className="mt-2 text-sm leading-relaxed text-slate-400">{author.bio}</p>}
                <Link
                  href={`/profile/${author._id}`}
                  className="mt-4 inline-block text-[10px] font-medium uppercase tracking-[0.3em] text-indigo-400 hover:text-indigo-300"
                >
                  More from {author.name.split(' ')[0]} →
                </Link>
              </div>
            </div>
          </footer>
        )}

        <div className="mt-20">
          <Comments
            postId={post._id}
            postSlug={post.slug}
            postAuthorId={author?._id}
            initialComments={discussion.comments}
            initialPagination={discussion.pagination}
          />
        </div>
      </div>
    </article>
  );
}
