import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getTagWithPosts } from '@/lib/data';
import PostList from '@/components/PostList';
import Pagination from '@/components/Pagination';
import { Eclipse, Eyebrow, RevealText } from '@/components/design';

export const dynamic = 'force-dynamic';

const getTag = cache((slug, page) => getTagWithPosts(slug, { page, limit: 10 }));

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const page = Number.parseInt((await searchParams).page, 10) || 1;
  const result = await getTag(slug, page);
  if (!result) return { title: 'Tag not found' };
  return { title: `#${result.tag.name}`, description: `Posts tagged #${result.tag.name} on DevLog` };
}

export default async function TagPage({ params, searchParams }) {
  const { slug } = await params;
  const page = Number.parseInt((await searchParams).page, 10) || 1;
  const result = await getTag(slug, page);
  if (!result) notFound();

  const { tag, posts, pagination } = result;

  return (
    <div>
      <header className="relative mb-14 grid items-end gap-8 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <Link href="/tags" className="fade-in text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500 transition hover:text-white">
            ← All topics
          </Link>
          <Eyebrow className="fade-in mb-5 mt-10">Topic</Eyebrow>
          <h1 className="font-display text-6xl leading-none tracking-tight text-white break-words sm:text-8xl">
            <span className="text-indigo-400">#</span>
            <RevealText text={tag.name} />
          </h1>
          <p className="fade-in mt-5 text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500" style={{ '--d': '400ms' }}>
            {String(tag.postCount).padStart(2, '0')} published {tag.postCount === 1 ? 'story' : 'stories'}
          </p>
        </div>
        <Eclipse className="hidden w-44 sm:block" />
      </header>

      <PostList
        posts={posts}
        startIndex={(pagination.page - 1) * pagination.limit + 1}
        emptyTitle="No posts with this tag yet"
        emptyMessage="Published posts tagged with this topic will show up here."
      />
      <Pagination
        page={pagination.page}
        pages={pagination.pages}
        buildHref={(p) => (p > 1 ? `/tag/${tag.slug}?page=${p}` : `/tag/${tag.slug}`)}
      />
    </div>
  );
}
