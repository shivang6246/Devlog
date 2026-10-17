import { NextResponse } from 'next/server';
import { dbUnavailableReason } from './db';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (msg) => new HttpError(400, msg);
export const unauthorized = (msg = 'Authentication required') => new HttpError(401, msg);
export const forbidden = (msg = 'You do not have permission to do that') => new HttpError(403, msg);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);

export function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Wraps a route handler so every failure becomes `{ error }` JSON with a
 * sensible status code — never an HTML error page.
 */
export function handler(fn) {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (err) {
      if (err instanceof HttpError) return errorResponse(err.message, err.status);

      const reason = dbUnavailableReason(err);
      if (reason) {
        console.error(`[api] Database unavailable (${reason}):`, err.message);
        return errorResponse('Database unavailable. Please try again shortly.', 503);
      }
      // Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
      if (err?.code === '23505') {
        // e.g. users_email_key → "email"
        const field = String(err.constraint_name || '').replace(/^[a-z]+_/, '').replace(/_(key|pkey)$/, '') || 'value';
        return errorResponse(`That ${field} is already in use`, 409);
      }
      if (err?.code === '23503') return errorResponse('Not found', 404); // row deleted mid-request
      if (['23514', '23502', '22001', '22P02'].includes(err?.code)) {
        return errorResponse('Validation failed', 400);
      }

      console.error('[api] Unhandled error:', err);
      return errorResponse('Internal server error', 500);
    }
  };
}

/** Parses a JSON object body, turning malformed input into a 400. */
export async function readJson(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    throw badRequest('Request body must be valid JSON');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Request body must be a JSON object');
  }
  return body;
}

/** Row ids are UUIDs; anything else can't exist, so callers treat it as 404. */
export function isValidId(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Trims + lowercases an email and checks its shape; throws 400 otherwise. */
export function readEmail(value) {
  if (typeof value !== 'string' || !value.trim()) throw badRequest('Email is required');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw badRequest('Please provide a valid email address');
  }
  return email;
}

/** Accepts '' or an http(s) URL; anything else (javascript:, data:, …) is rejected. */
export function validateUrl(value, field) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') throw badRequest(`${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) return '';
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw badRequest(`${field} must be a valid URL`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw badRequest(`${field} must be an http(s) URL`);
  }
  if (trimmed.length > 2048) throw badRequest(`${field} is too long`);
  return trimmed;
}
