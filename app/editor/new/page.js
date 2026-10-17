'use client';

import PostEditor from '@/components/PostEditor';

// Protected by middleware.js; the API re-checks auth on save.
export default function NewPostPage() {
  return <PostEditor />;
}
