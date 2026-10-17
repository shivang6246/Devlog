# DevLog — Implementation Plan

Next.js 15 (App Router, JavaScript) full-stack blog. One process: pages + REST Route Handlers.

## Architecture

```
app/
  api/**/route.js        REST handlers, all wrapped by lib/api.js `handler()` → { error } JSON on any throw
  (pages)                Server Components for public reads, Client Components for authoring
lib/
  env.js                 validates MONGODB_URI / JWT_SECRET, throws at startup if missing
  db.js                  cached Mongoose connection on globalThis
  jwt.js                 jose sign/verify (edge-safe, used by middleware + auth)
  auth.js                getAuthUser(request), requireAuth(request), cookie helpers
  api.js                 handler wrapper, HttpError, json helpers
  slug.js                slugify + unique slug with numeric suffix
  tags.js                upsertTags(names) → [ObjectId]
  data.js                server-side data functions used by Server Components AND API routes
  serialize.js           lean docs → plain JSON (ObjectId/Date → string)
models/                  User, Post, Tag
middleware.js            edge JWT check for /dashboard, /editor/*, /settings
components/              Navbar, PostCard, PostList, TagPill, MarkdownEditor, MarkdownRenderer,
                         AuthForm, LoadingSpinner, EmptyState, ErrorMessage, ConfirmDialog
context/AuthContext.js   useAuth(); hydrates from /api/auth/me
scripts/seed.js          2 users, 8 posts, 5 tags, ≥1 draft, code blocks
```

## Security invariants (hard failures)
- `User.password` has `select: false`; `toJSON` transform deletes it as a second line of defence.
  Every user payload goes through `publicUser()`.
- Ownership: PUT/DELETE `/api/posts/[id]` load the post, compare `post.author` to auth user id → 403.
- Draft filtering lives in `lib/data.js` — every public query hard-codes `status: 'published'`.
- Markdown goes through `rehype-sanitize` (with a schema extension that only allows
  `className` on `code`/`span` so highlighting survives), before `rehype-highlight`.

## Phases (each verified before moving on)
1. **Foundation** — scaffold, Tailwind v4 + typography, db, models, jwt/auth, auth routes.
   Verify with curl: register/login return token + cookie, `/api/auth/me` 401 without token.
2. **Post & tag API** — CRUD, slugs, tag upsert, ownership, drafts, tags/users routes.
   Verify: CRUD round trip; 2nd user gets 403; draft absent from `/api/posts`.
3. **Public surface** — `/`, `/post/[slug]`, `/tag/[slug]`, `/tags`, search; MarkdownRenderer.
   Verify: logged-out HTML render, highlighted code, `<script>` in body not executed.
4. **Authoring** — middleware, AuthContext, Navbar, login/register, editor, dashboard,
   profile, settings. Verify end-to-end flow via HTTP.
5. **Polish & deploy** — loading/empty/error states, 375px layout, seed, README, `next build`,
   Vercel deploy (needs your Vercel + Atlas credentials).
