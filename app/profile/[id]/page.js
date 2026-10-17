import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getUserProfile } from '@/lib/data';
import PostList from '@/components/PostList';
import Avatar from '@/components/Avatar';
import { Eclipse, Eyebrow, RevealText, SpecSheet } from '@/components/design';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const getProfile = cache((id) => getUserProfile(id));

export async function generateMetadata({ params }) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) return { title: 'User not found' };
  return { title: profile.user.name, description: profile.user.bio || `${profile.user.name} on DevLog` };
}

export default async function ProfilePage({ params }) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const { user, posts, pagination } = profile;

  return (
    <div>
      <header className="relative mb-16 grid items-center gap-10 md:grid-cols-[auto_minmax(0,1fr)]">
        <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-indigo-600/15 blur-[100px] haze" />
        {/* The avatar sits inside the glowing ring, like the bust in the reference. */}
        <Eclipse className="relative mx-auto w-48 sm:w-56">
          <div className="absolute inset-[14%] flex items-center justify-center">
            <Avatar name={user.name} src={user.avatarUrl} size="lg" className="h-full! w-full! text-5xl! shadow-2xl shadow-black" />
          </div>
        </Eclipse>

        <div className="relative min-w-0 text-center md:text-left">
          <Eyebrow className="fade-in mb-5 justify-center md:justify-start">Author</Eyebrow>
          <RevealText as="h1" text={user.name} className="font-display text-5xl leading-none tracking-tight text-white sm:text-7xl" />
          {user.bio && (
            <p className="fade-in mx-auto mt-5 max-w-xl font-display text-xl italic text-slate-400 md:mx-0" style={{ '--d': '400ms' }}>
              “{user.bio}”
            </p>
          )}
        </div>
      </header>

      <div className="fade-in mb-14" style={{ '--d': '600ms' }}>
        <SpecSheet
          items={[
            { label: 'Stories', value: String(pagination.total).padStart(2, '0') },
            { label: 'Member since', value: formatDate(user.createdAt) },
            { label: 'Latest', value: posts[0] ? formatDate(posts[0].publishedAt) : '—' },
          ]}
        />
      </div>

      <Eyebrow className="mb-6">Published work</Eyebrow>
      <PostList
        posts={posts}
        showAuthor={false}
        emptyTitle="No published posts"
        emptyMessage={`${user.name} hasn't published anything yet.`}
      />
    </div>
  );
}
