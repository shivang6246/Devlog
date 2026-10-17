/** Only allow same-origin relative paths as post-login redirects (no open redirects). */
export function safeRedirect(from, fallback = '/dashboard') {
  if (typeof from !== 'string') return fallback;
  if (!from.startsWith('/') || from.startsWith('//') || from.startsWith('/\\')) return fallback;
  if (from.startsWith('/login') || from.startsWith('/register')) return fallback;
  return from;
}

export function loginUrl(from) {
  return `/login?from=${encodeURIComponent(from)}`;
}
