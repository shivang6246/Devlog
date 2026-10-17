import { errorResponse } from '@/lib/api';

// Unknown /api/* paths return JSON instead of the HTML 404 page.
const notFound = () => errorResponse('API route not found', 404);

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
