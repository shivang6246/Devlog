import PostCard from './PostCard';
import EmptyState from './EmptyState';

export default function PostList({
  posts,
  showAuthor = true,
  startIndex = 1,
  numbered = true,
  emptyTitle,
  emptyMessage,
  emptyAction,
}) {
  if (!posts?.length) {
    return (
      <EmptyState
        title={emptyTitle || 'No posts yet'}
        message={emptyMessage || 'Nothing has been published here yet.'}
        action={emptyAction}
      />
    );
  }
  return (
    <div className="border-b border-white/10">
      {posts.map((post, i) => (
        <PostCard
          key={post._id}
          post={post}
          index={numbered ? startIndex + i : undefined}
          showAuthor={showAuthor}
        />
      ))}
    </div>
  );
}
