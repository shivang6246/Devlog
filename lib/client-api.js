/**
 * Browser-side fetch wrapper for the REST API. Sends the httpOnly cookie
 * (credentials: 'include') and turns `{ error }` responses into thrown Errors.
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.status = status;
    this.data = data; // full error body, e.g. { error, requiresVerification, email }
  }
}

export async function apiFetch(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError('Network error — check your connection and try again.', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body; handled below
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}
