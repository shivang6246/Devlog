import Link from 'next/link';
import { listTagsWithCounts } from '@/lib/data';
import EmptyState from '@/components/EmptyState';
import { Eyebrow, RevealText } from '@/components/design';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Topics', description: 'Browse DevLog posts by topic' };

export default async function TagsPage() {
  const tags = await listTagsWithCounts();

  return (
    <div>
      <header className="mb-14">
        <Eyebrow className="fade-in mb-6">Index of topics</Eyebrow>
        <RevealText
          as="h1"
          text="Everything we write about."
          className="max-w-4xl font-display text-5xl leading-[1] tracking-tight text-white sm:text-7xl 2xl:max-w-5xl 2xl:text-8xl"
        />
        <p className="fade-in mt-5 text-sm text-slate-500" style={{ '--d': '500ms' }}>
          {tags.length} topic{tags.length === 1 ? '' : 's'} in the archive
        </p>
      </header>

      {tags.length === 0 ? (
        <EmptyState title="No topics yet" message="Topics appear here once posts are published with them." />
      ) : (
        <ul className="border-b border-white/10">
          {tags.map((tag, i) => (
            <li key={tag._id} className="scroll-reveal">
              <Link
                href={`/tag/${tag.slug}`}
                className="group relative flex items-baseline gap-5 overflow-hidden border-t border-white/10 py-6 sm:gap-8 sm:py-7"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-indigo-600/0 via-indigo-600/10 to-indigo-600/0 transition-transform duration-700 group-hover:translate-x-0" />
                <span className="w-8 shrink-0 font-display text-sm tabular-nums text-indigo-400">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1 truncate font-display text-4xl text-slate-300 transition duration-500 group-hover:translate-x-2 group-hover:text-white sm:text-6xl">
                  {tag.name}
                </span>
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500 transition group-hover:text-white">
                  {String(tag.postCount).padStart(2, '0')} {tag.postCount === 1 ? 'story' : 'stories'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
