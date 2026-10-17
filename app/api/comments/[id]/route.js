import { handler, json } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { deleteComment } from '@/lib/engagement';

// DELETE /api/comments/:id — comment author or the post's author
export const DELETE = handler(async (request, { params }) => {
  const user = await requireAuth(request);
  const { id } = await params;
  const result = await deleteComment(id, user);
  return json({ message: 'Comment deleted', ...result });
});
