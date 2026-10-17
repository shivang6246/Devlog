import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getPostById } from '@/lib/data';
import { loginUrl } from '@/lib/redirect';
import PostEditor from '@/components/PostEditor';
import ErrorMessage from '@/components/ErrorMessage';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit post' };

/**
 * Server-side gate for the (client) editor: middleware has already checked the
 * JWT, but ownership is verified here against the database before any post
 * data is sent to the browser. The API re-checks again on save.
 */
export default async function EditPostPage({ params }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(loginUrl(`/editor/${id}`));

  const post = await getPostById(id);
  if (!post) notFound();

  if (post.author?._id !== String(user._id)) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <ErrorMessage title="403 — Not your post" message="You can only edit posts you wrote." />
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-indigo-400 hover:underline">
          ← Back to your dashboard
        </Link>
      </div>
    );
  }

  return <PostEditor key={post._id} initialPost={post} />;
}
