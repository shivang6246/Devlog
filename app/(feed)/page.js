import Link from 'next/link';
import { getSiteStats, listPublishedPosts, listTagsWithCounts } from '@/lib/data';
import PostList from '@/components/PostList';
import SearchBox from '@/components/SearchBox';
import TagPill from '@/components/TagPill';
import Pagination from '@/components/Pagination';
import CursorGlow from '@/components/CursorGlow';
import { Eclipse, Eyebrow, RailPager, RevealText, SpecSheet } from '@/components/design';
import { primaryButton, secondaryButton } from '@/components/ui';

export const dynamic = 'force-dynamic';

const PER_PAGE = 10;
const pad = (n) => String(n).padStart(2, '0');

function Hero({ stats }) {
  return (
    <section className="relative -mx-(--gutter) -mt-10 mb-16 flex flex-col overflow-hidden px-(--gutter) pb-10 pt-8 sm:-mt-14 lg:min-h-[calc(100svh-4rem)] lg:justify-center lg:pt-16">
      <CursorGlow />

      {/* Faint vertical grid lines, only in the hero, fading out toward the bottom. */}
      <div
        aria-hidden="true"
        className="grid-lines pointer-events-none absolute inset-0 opacity-60 [--cols:4] [mask-image:linear-gradient(to_bottom,black_30%,transparent)] lg:[--cols:6]"
      />

      {/* Cobalt haze + the ring, sitting behind the headline like the reference's halo. */}
      <div aria-hidden="true" className="pointer-events-none absolute right-[-30%] top-0 h-[80vw] w-[80vw] max-h-[720px] max-w-[720px] rounded-full bg-indigo-600/20 blur-[120px] haze sm:right-[-6%] lg:right-[12%] lg:top-[4%]" />

      {/* Below lg the ring sits in the flow above the headline (clear of the text on phones,
          slightly overlapped on tablets), so it never covers copy; on lg+ it floats behind the
          headline like the reference. */}
      <Eclipse className="relative mb-4 -mr-[14vw] sm:-mb-[min(9vw,64px)] ml-auto w-[min(76vw,440px)] sm:-mr-[4vw] lg:hidden" />
      <Eclipse className="absolute right-[24%] top-[8%] hidden w-[430px] lg:block xl:right-[27%] xl:w-[480px] 2xl:top-[7%] 2xl:w-[560px]" />

      <RailPager className="absolute left-[calc(var(--gutter)/2)] top-1/2 hidden -translate-y-1/2 lg:flex" count={4} active={0} />

      <div className="relative grid items-end gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:pl-10 2xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <Eyebrow className="fade-in mb-6 sm:mb-8">A journal for developers</Eyebrow>
          <h1 className="font-display text-[3.25rem] leading-[0.92] tracking-tight text-white min-[360px]:text-[3.6rem] min-[400px]:text-[4.2rem] sm:text-8xl lg:text-[7.25rem] xl:text-[8.25rem] 2xl:text-[9.5rem]">
            <RevealText text="Stories" className="block" />
            <RevealText text="written in" delay={180} className="block pl-[8%]" />
            <RevealText text="code." delay={420} className="block italic text-slate-300" />
          </h1>
        </div>

        <div className="fade-in max-w-md lg:max-w-xs lg:pb-4" style={{ '--d': '900ms' }}>
          <p className="text-sm leading-relaxed text-slate-400">
            Deep dives, hard-won lessons and small discoveries from engineers who build things — written in
            Markdown, rendered with care.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/editor/new" className={primaryButton}>Start writing</Link>
            <a href="#latest" className={secondaryButton}>Read ↓</a>
          </div>
        </div>
      </div>

      <div className="fade-in relative mt-10 sm:mt-14 lg:pl-10" style={{ '--d': '1200ms' }}>
        <SpecSheet
          items={[
            { label: 'Stories published', value: pad(stats.stories) },
            { label: 'Topics explored', value: pad(stats.topics) },
            { label: 'Authors writing', value: pad(stats.authors) },
          ]}
        />
      </div>
    </section>
  );
}

export default async function HomePage({ searchParams }) {
  const sp = await searchParams;
  const search = typeof sp.search === 'string' ? sp.search.trim() : '';
  const page = Number.parseInt(sp.page, 10) || 1;
  const showHero = !search && page === 1;

  const [{ posts, pagination }, tags, stats] = await Promise.all([
    listPublishedPosts({ search, page, limit: PER_PAGE }),
    listTagsWithCounts(),
    showHero ? getSiteStats() : null,
  ]);
  const popular = tags.filter((t) => t.postCount > 0).slice(0, 10);

  const buildHref = (p) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (p > 1) q.set('page', String(p));
    const s = q.toString();
    return s ? `/?${s}` : '/';
  };

  return (
    <>
      {showHero && <Hero stats={stats} />}

      <section id="latest" className="scroll-mt-24">
        <div className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div>
            <Eyebrow className="mb-4">{search ? 'Search the archive' : 'The archive'}</Eyebrow>
            <h2 className="font-display text-5xl leading-none text-white sm:text-6xl">
              {search ? (
                <>
                  Results for <em className="text-slate-400">“{search}”</em>
                </>
              ) : (
                <>
                  Latest <em className="text-slate-400">stories</em>
                </>
              )}
            </h2>
            {search && (
              <p className="mt-3 text-sm text-slate-500">
                {pagination.total} post{pagination.total === 1 ? '' : 's'} found
              </p>
            )}
          </div>
          <SearchBox defaultValue={search} />
        </div>

        {popular.length > 0 && !search && (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-[10px] font-medium uppercase tracking-[0.3em] text-slate-600">Topics</span>
            {popular.map((tag) => (
              <TagPill key={tag._id} tag={tag} count={tag.postCount} />
            ))}
            <Link href="/tags" className="ml-1 text-[10px] font-medium uppercase tracking-[0.25em] text-indigo-400 hover:text-indigo-300">
              All →
            </Link>
          </div>
        )}

        <PostList
          posts={posts}
          startIndex={(pagination.page - 1) * pagination.limit + 1}
          emptyTitle={search ? 'No matching posts' : 'No posts yet'}
          emptyMessage={search ? 'Try a different search term.' : 'Be the first to publish something.'}
          emptyAction={
            search ? (
              <Link href="/" className={secondaryButton}>Clear search</Link>
            ) : (
              <Link href="/editor/new" className={primaryButton}>Write a post</Link>
            )
          }
        />
        <Pagination page={pagination.page} pages={pagination.pages} buildHref={buildHref} />
      </section>
    </>
  );
}
