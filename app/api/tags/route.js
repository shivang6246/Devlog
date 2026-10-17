import { handler, json } from '@/lib/api';
import { listTagsWithCounts } from '@/lib/data';

// GET /api/tags — every tag with its published-post count
export const GET = handler(async () => json({ tags: await listTagsWithCounts() }));
