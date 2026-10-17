# CLAUDE.md — DevLog

A full-stack developer blogging platform (a Hashnode clone). **One Next.js app is both the frontend and the backend.** There is no separate Express server. The REST API lives in `app/api/**`.

## Status (last updated 2026-10-17)

| Phase | State |
| --- | --- |
| 1. Foundation (Next.js, Tailwind, Mongoose, models, auth lib, auth routes) | ✅ done + verified |
| 2. Post & tag API (CRUD, slugs, tag upsert, ownership, draft filtering) | ✅ done + verified |
| 3. Public surface (feed, post, tag, tags, search, profile) | ✅ done + verified |
| 4. Authoring (middleware, editor, dashboard, settings) | ✅ done + verified |
| 5. Polish & deploy | ✅ polish, 375px layout, prod build, README · ⏳ **Vercel deploy not done** |
| 7. "Museum" dark theme redesign (inspired by Sandhill Studio's *Lourve* concept) | ✅ done + verified (desktop + 375px screenshots; e2e, OTP UI and public-page suites all pass) |
| 6. Email OTP auth (sign-up verification + forgot password) | ✅ done + verified (27 API + 14 browser checks; earlier suites re-run with no regressions) |
| 8. Likes, comments, share + light/dark mode | ✅ done + verified (36 API + 35 browser checks; all earlier suites and the responsive audit re-run with no regressions) |
| 9. MongoDB → Supabase Postgres (postgres.js, plain SQL, `db/schema.sql`) | ✅ done + verified (local Postgres 17: 167 API + 18 page + 23 prod-build checks; real Supabase via the transaction pooler: 11-check smoke test). Schema + seed applied to Supabase |
| 10. Speed: functions in `sin1`, OTP email after the response, optional Upstash Redis cache | ✅ code done + verified locally (15 cache unit + 29 cache integration + 167 API with Redis on + 167 API with Redis off + 11 prod-build checks; Redis outage/slowness, SMTP failure). Uses a mock Upstash REST server; no real Upstash DB yet. ⏳ **not pushed/deployed yet** |

Phase 9 was verified on a local Postgres 17 (UTF-8) using `next dev` and `next build && next start`. All API responses keep the old shape (`_id`, camelCase, embedded `author`/`tags`), so no UI code changed. The Playwright browser suite was **not** re-run after the migration.

### Open TODOs
- [x] Supabase project `vghcurikulhxnwtdmxxd` (Singapore). `.env.local` uses the **transaction pooler** `aws-0-ap-southeast-1.pooler.supabase.com:6543`, user `postgres.vghcurikulhxnwtdmxxd`. Schema + seed applied. The old `MONGODB_URI` line is unused and can be deleted. Atlas data was **not** copied over.
- [ ] **Rotate the Supabase DB password.** It was pasted into a chat on 2026-10-17. Then update `.env.local` and Vercel.
- [x] Deployed: `https://devlog-iota-green.vercel.app`. Its `DATABASE_URL` is the pooler URI. Verified 2026-10-17: feed, tags, post pages, login, draft 404. The URL is in README.md.
- [ ] Push phase 10 to `main` so Vercel redeploys. `vercel.json` moves the functions from `iad1` (Washington) to `sin1`, next to the Singapore DB; the 1–3 s pages and slow login came from that distance.
- [ ] Create an Upstash Redis DB (Vercel → Storage → Upstash for Redis, region Singapore, connect to the project), then redeploy. Without it the cache is simply off.
- [x] SMTP (Gmail app password) set in `.env.local`. Verified 2026-10-17: Gmail accepts the login, and a real sign-up OTP email was sent from the production build.
- [ ] Deploy to Vercel + Supabase (steps in README.md), then put the live URL in README.md.
- [ ] `git init` and make the first commit. The folder is not a git repo yet.
- [ ] Optional: add ESLint (`eslint-config-next`). It isn't installed, and the `lint` script was removed.

## Tech stack

- **Framework:** Next.js 15.5 (App Router), React 19, **JavaScript only (no TypeScript)**, `"type": "module"`.
- **Database:** Postgres on **Supabase**, through `postgres` (postgres.js 3) with plain SQL. There's no ORM, and Supabase Auth and supabase-js aren't used. The schema lives in `db/schema.sql`.
- **Auth:** JWT (HS256) signed with `jose`, stored in an **httpOnly cookie** `devlog_token`. `Authorization: Bearer <token>` is also accepted (for Postman).
- **Passwords:** `bcryptjs`, 12 rounds.
- **Email / OTP:** `nodemailer` over SMTP (Gmail app password, Brevo, Mailtrap, …). Codes come from `crypto.randomInt` and are stored as an HMAC-SHA256.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`) + `@tailwindcss/typography`. Light + dark themes via `[data-theme]` CSS variables (default dark, toggle saved in localStorage).
- **Markdown:** `react-markdown` + `remark-gfm` + `rehype-sanitize` + `rehype-highlight` (the `highlight.js` github-dark theme).
- **Fonts:** `next/font/google` (Inter, Bodoni Moda, JetBrains Mono).
- **Cache (optional):** Upstash Redis over REST (`@upstash/redis`) in `lib/cache.js`. It's off when no Upstash env vars are set.
- **Hosting:** Vercel. `vercel.json` pins functions to `sin1`, which must stay in the same region as Supabase (`ap-southeast-1`).
- **Dev:** `dotenv` (used by `scripts/` only).

## Commands

```bash
npm install
npm run dev      # frontend + API at http://localhost:3000 (API under /api)
npm run build    # production build
npm start        # serve production build
npm run db:setup # apply db/schema.sql (tables, indexes, RLS) — idempotent
npm run seed     # applies schema, then 2 users, 8 posts (7 published, 1 draft), 5 tags, 10 likes, 6 comments — idempotent, one transaction
```

Seed logins (password `password123`): `maya@devlog.dev`, `leo@devlog.dev`.

## Environment variables

`.env.local` (git-ignored). `.env.example` is committed.

| Var | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Supabase **Transaction pooler** URI (`…pooler.supabase.com:6543/postgres`). SSL is on for any non-localhost host. `prepare: false` is always set, because the pooler can't do prepared statements |
| `JWT_SECRET` | yes | Long random string |
| `NEXT_PUBLIC_APP_URL` | recommended | Used for `metadataBase` (canonical/OG URLs) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | prod | OTP email delivery. Port 465 = implicit TLS, 587 = STARTTLS |
| `EMAIL_FROM` | optional | Defaults to `DevLog <SMTP_USER>` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | optional | Turns on the Redis cache. `KV_REST_API_URL` / `KV_REST_API_TOKEN` (set by Vercel's Upstash integration) also work |

Without SMTP, **dev** logs the email (with the code) to the server console, and **prod** throws when sending (→ 502), with a warning at startup.

`instrumentation.js` calls `assertEnv()` from `lib/env.js`, so the server **refuses to start** if `DATABASE_URL` or `JWT_SECRET` is missing.

## Project structure

```
app/
  layout.js                  root layout: fonts, AuthProvider, Navbar, footer
  globals.css                Tailwind v4 + typography + code-block styles (.markdown-body)
  (feed)/page.js             /  feed + search + popular tags   [Server]
  (feed)/loading.js          feed loading state
  post/[slug]/page.js        /post/:slug                       [Server, generateMetadata]
  tag/[slug]/page.js         /tag/:slug                        [Server]
  tags/page.js + loading.js  /tags                             [Server]
  profile/[id]/page.js       /profile/:id                      [Server]
  login/, register/          auth forms                        [Client] (+ layout.js for title)
  verify-email/page.js       enter the 6-digit sign-up code (?email=&from=)  [Client]
  forgot-password/page.js    email → code + new password (2 steps)           [Client]
  dashboard/page.js          my drafts + published             [Client]
  editor/new/page.js         new post                          [Client]
  editor/[id]/page.js        SERVER ownership gate → <PostEditor> (client)
  settings/page.js           profile + password change         [Client]
  not-found.js, error.js     global 404 / error boundary
  api/
    auth/{register,login,logout,me}/route.js
    auth/{verify-email,resend-otp,forgot-password,reset-password}/route.js
    posts/route.js           GET list, POST create
    posts/[idOrSlug]/route.js  GET by slug, PUT/DELETE by id
    posts/mine/route.js
    tags/route.js, tags/[slug]/posts/route.js
    users/[id]/route.js, users/me/route.js
    posts/[idOrSlug]/like/route.js      GET state, POST like, DELETE unlike (by post id)
    posts/[idOrSlug]/comments/route.js  GET list (public), POST add (protected)
    comments/[id]/route.js              DELETE (comment author or post author)
    [...notfound]/route.js   JSON 404 for unknown /api paths
components/
  Navbar, PostCard, PostList, TagPill, Avatar, SearchBox, Pagination,
  MarkdownEditor (textarea + live preview, split / tabs), MarkdownRenderer (shared),
  PostEditor, TagInput, AuthForm, ConfirmDialog (native <dialog>),
  OtpInput (6 boxes, paste/autofill, auto-submit), ResendCode (60s countdown),
  LikeButton (optimistic), ShareButton (Web Share API / menu), Comments, PostActions,
  ThemeToggle,
  LoadingSpinner, EmptyState, ErrorMessage, ui.js (shared class strings + Spinner)
context/AuthContext.js       AuthProvider + useAuth(); hydrates from /api/auth/me
db/schema.sql   users, tags, posts, post_tags, likes, comments, otps (+ indexes, RLS on). Idempotent
lib/
  env.js        assertEnv / requireEnv
  pg-options.js postgres.js options (SSL, prepare:false, 8s connect timeout, snake→camel columns).
                No `@/` imports: scripts/ use it too
  db.js         `sql` (lazy postgres.js pool on globalThis.__sql, via a Proxy), dbUnavailableReason(err)
  users.js      findUserById / findUserByEmail / createUser / updateUser / authenticate / checkPassword.
                The ONLY module that reads users.password
  jwt.js        signToken / verifyToken (edge-safe; used by middleware)
  auth.js       getAuthUser(request), requireAuth(request), getSessionUser() (RSC),
                setAuthCookie / clearAuthCookie, publicUser()
  api.js        handler() wrapper (maps PG errors), HttpError + helpers, readJson, readEmail,
                isValidId (UUID), validateUrl
  otp.js        issueOtp / issueOtpIfAllowed / consumeOtp (TTL 10m, cooldown 60s, 5 attempts).
                Email is sent in after(), so issueOtp must run inside a route handler
  cache.js      cachedContent(key, load) / bumpContentVersion() / cachedUser / forgetUser.
                No `@/` imports: scripts/seed.js uses it
  engagement.js likePost / unlikePost / getLikeState, listComments / addComment / deleteComment
                (published posts only)
  email.js      sendMail (nodemailer; console fallback in dev), sendOtpEmail (HTML + text)
  data.js       READ queries used by Server Components AND API routes
  posts.js      WRITE logic: createPost / updatePost (transactions), uniqueSlug
  slug.js       slugify, escapeRegex
  tags.js       normalizeTagNames, upsertTags
  excerpt.js    excerptFromMarkdown, readingTime
  format.js     formatDate (en-US, UTC), initials
  client-api.js apiFetch (browser; credentials: 'include'; throws ApiError)
  redirect.js   safeRedirect (no open redirects), loginUrl
middleware.js   protects /dashboard, /editor/*, /settings; bounces logged-in users off /login, /register, /verify-email, /forgot-password
vercel.json     "regions": ["sin1"] — same region as the Supabase DB
scripts/db-setup.js, scripts/seed.js
```

## Data model (Postgres, `db/schema.sql`)

Columns are snake_case. `pg-options.js` maps them to camelCase on read, and queries alias `id as _id`, so JS objects look exactly like the old Mongo documents. Ids are UUIDs (`gen_random_uuid()`), timestamps are `timestamptz`, and `updated_at` is set explicitly (`updated_at = now()`) by the UPDATEs that should bump it. There are no triggers.

- **users:** `name` (1–60), `email` (unique, must be lowercase), `password` (bcrypt hash), `bio` (≤200), `avatar_url`, `email_verified` (default false; unverified users can't log in, seed users are created verified), timestamps.
- **posts:** `title` (1–150), `slug` (unique), `content` (raw Markdown, ≤100k), `excerpt` (≤250), `cover_image`, `status` (`draft` | `published`), **`published_at`** (set on first publish, orders the feed), `author_id` → users (cascade), `like_count` / `comment_count` (≥0), timestamps. Index `(status, published_at desc, id desc)`.
- **tags:** `name` (unique, lowercase, ≤30), `slug` (unique), timestamps.
- **post_tags:** `(post_id, tag_id)` primary key, plus `position`, which keeps the author's tag order. Both FKs cascade.
- **otps:** primary key `(email, purpose)`, so there's one active code per purpose. Also `code_hash` (HMAC-SHA256 keyed with JWT_SECRET), `expires_at`, `attempts`, `last_sent_at`. There's no TTL index: `issueOtp` sweeps expired rows.
- **likes:** primary key `(post_id, user_id)`.
- **comments:** `post_id`, `author_id`, `content` (plain text, 1–2000), timestamps. Index `(post_id, created_at, id)`.
- **like_count / comment_count:** denormalized counters, changed only in `lib/engagement.js` (never settable through PUT). Each write changes the row and the counter in **one statement** (a data-modifying CTE).
- **RLS is enabled on every table with no policies.** That blocks Supabase's public Data API. The app connects as the table owner, which bypasses RLS. Any new table needs `enable row level security` too.

## API

| Method | Route | Access |
| --- | --- | --- |
| POST | /api/auth/register | public → 201 `{ requiresVerification, email }`, emails an OTP, **no session** |
| POST | /api/auth/verify-email | public `{ email, otp }` → `{ user, token }` + cookie |
| POST | /api/auth/resend-otp | public `{ email }` → generic 200 (429 inside the 60s cooldown) |
| POST | /api/auth/login | public → `{ user, token }` + cookie; unverified → 403 `{ requiresVerification, email }` + fresh OTP |
| POST | /api/auth/forgot-password | public `{ email }` → generic 200, emails a reset OTP if the account exists |
| POST | /api/auth/reset-password | public `{ email, otp, newPassword }` → `{ user, token }` + cookie |
| POST | /api/auth/logout | public |
| GET | /api/auth/me | protected |
| GET | /api/posts | public, published only; `?search=&tag=&page=&limit=` (limit ≤ 50) |
| GET | /api/posts/:slug | public, published only |
| POST | /api/posts | protected |
| PUT | /api/posts/:id | protected, owner only (partial update) |
| DELETE | /api/posts/:id | protected, owner only |
| GET | /api/posts/mine | protected (drafts + published) |
| GET | /api/tags | public; each tag has `postCount` (published only) |
| GET | /api/tags/:slug/posts | public, published only |
| GET | /api/users/:id | public profile (no email) + published posts |
| GET/PUT | /api/users/me | protected; PUT: name, bio, avatarUrl, optional currentPassword + newPassword |
| GET | /api/posts/:id/like | public `{ liked, likeCount }` |
| POST / DELETE | /api/posts/:id/like | protected; like / unlike, both idempotent |
| GET | /api/posts/:id/comments | public, oldest first, `?page=&limit=` |
| POST | /api/posts/:id/comments | protected `{ content }` → 201; 429 within 3s of your last comment |
| DELETE | /api/comments/:id | protected; comment author or post author, else 403 |

Error shape everywhere: `{ "error": "message" }`. Status codes:
- 400: validation or bad JSON
- 401: unauthenticated
- 403: not the owner
- 404: not found (drafts on public routes count as not found)
- 409: duplicate email
- 429: OTP cooldown or too many attempts
- 500: unexpected
- 502: OTP email failed to send
- 503: DB unreachable, auth rejected, project paused or tables missing (`dbUnavailableReason()` in `lib/db.js` logs which; `connect_timeout: 8`)

Postgres errors are mapped in `handler()`:
- `23505` unique → 409 `That <field> is already in use`
- `23503` FK → 404
- `23514` / `23502` / `22001` / `22P02` → 400

## Rules — do not break these (hard failures)

1. **Never expose passwords.** Only `lib/users.js` may read `users.password`, and only inside `authenticate()` / `checkPassword()`. Never `select *` from `users`, and never join users without an explicit column list. Return users only through `publicUser()`. Embed authors with `json_build_object` allow-lists (`authorJson()` in `lib/data.js`: `_id, name, avatarUrl, bio`).
2. **Ownership is checked in the handler.** `loadOwnedPost()` in `posts/[idOrSlug]/route.js` does 401 → 404 → 403 by comparing `post.authorId === user._id`. Never take `author`, `slug` or `publishedAt` from the request body (`parseFields` in `lib/posts.js` whitelists fields).
3. **No drafts on public surfaces.** Every public function in `lib/data.js` hard-codes `status = 'published'`. New public queries must go through `findPublishedPage()` or do the same.
4. **SQL is always a postgres.js tagged template** (`` sql`… ${value}` ``). Never build SQL with string concatenation, and never use `sql.unsafe()` with user input (only the scripts use it, to run `db/schema.sql`). Escape LIKE patterns (`escapeLike` in `lib/data.js`).
5. **Every route handler is wrapped in `handler()`** from `lib/api.js` and throws `HttpError`s (`badRequest`, `unauthorized`, `forbidden`, `notFound`). Protected handlers call `requireAuth(request)`.
6. **Markdown safety:** never add `rehype-raw`. Keep `rehype-sanitize` running *before* `rehype-highlight`. Image and link URLs from users must pass `validateUrl` (http/https only).
7. **The app must run from a clean clone** following README.md.
8. **OTP safety:** the email is sent in `after()` (post-response). On failure it logs and deletes *that* code (`where code_hash = …`), so Resend isn't blocked. A production server without SMTP must still throw 502 *before* storing a code (`canSendMail()`). Never store or log a plain code outside the dev console fallback. Never issue a session from `register`; only `verify-email`, `login` (verified users) and `reset-password` set the cookie. `forgot-password` and `resend-otp` must respond the same whether or not the account exists. Keep the attempt counter atomic (`update … set attempts = attempts + 1 where attempts < 5 … returning`), keep the cooldown inside the upsert (`on conflict … do update … where last_sent_at <= …`), and keep codes single-use (`delete … where code_hash = …`, then check `count`).
9. **Engagement safety:** likes/comments only on *published* posts (drafts → 404, via `findPublishedPost`). Comments are plain text rendered by React (never Markdown/HTML). Comment authors are embedded with `_id, name, avatarUrl` only. Counters change only inside the same SQL statement as the like/comment row (CTEs in `lib/engagement.js`). Deleting a post removes its likes, comments and tag links via `ON DELETE CASCADE`.
10. **Cache safety (`lib/cache.js`):**
    - Only data that is identical for every visitor goes through `cachedContent()`. Never cache drafts, per-viewer state (like state, dashboard, editor), or free-text search results.
    - Keys must come from bounded sets: the first `CACHED_PAGES` pages, ids/slugs that exist (`null` isn't cached), and slug length ≤ 200.
    - **Every write that can change a public page must `await bumpContentVersion()` after its DB write.** Today that's create/update/delete post, like/unlike (only when `count` > 0), add/delete comment, and `updateUser` when name/bio/avatar change.
    - `updateUser` always calls `forgetUser(id)`.
    - The cached user object comes from `userColumns()`, so it never contains the password hash.
    - A Redis failure must never fail a request: `attempt()` falls back to the DB and pauses Redis for 30 s.

## Architecture conventions

- **Public read pages are Server Components** that call `lib/data.js` directly. They never fetch their own `/api` over HTTP. They use `export const dynamic = 'force-dynamic'` and `React.cache()` to dedupe the query between `generateMetadata` and the page.
- **Interactive pages are Client Components** that call the API through `apiFetch()` (`lib/client-api.js`). On `err.status === 401` they `router.replace(loginUrl(path))`.
- **Auth state lives in the cookie.** `AuthContext` is only a UI convenience. Don't use `localStorage` for auth.
- **Next.js 15:** `params` and `searchParams` are Promises, so `await` them.
- **Route handler params:** `handler(async (request, { params }) => { const { id } = await params; ... })`.
- **Slugs:** a numeric suffix is added on collision (`-2`, `-3`, …). The slug follows the title while the post is a draft and is **frozen after first publish**. `withUniqueSlug` retries when a concurrent insert hits `23505` on `posts_slug_key`.
- **Tags:** sent by name, lowercased, deduped, max 5, each ≤30 chars. An existing tag is reused when its name OR slug matches. `slugify` maps `+` → `plus` and `#` → `sharp`.
- **Excerpt:** auto-generated from the content when empty.
- **Dates:** format with `formatDate()` (fixed en-US + UTC) to avoid hydration mismatches.
- **Styling:** reuse the class strings in `components/ui.js` (`inputClass`, `primaryButton`, …). Use the indigo accent, slate neutrals, and always add `dark:` variants.
- **Images:** use plain `<img>` (arbitrary user URLs), not `next/image`.

## Design system ("museum" dark theme)

Inspired by a cinematic museum site concept: black canvas, thin vertical grid lines, huge serif headlines, a glowing ring, electric-blue accents, and tiny tracked uppercase labels.

- **Two themes.** `<html data-theme="dark|light">` is set before first paint by the inline script in `app/layout.js` (localStorage key `devlog-theme`, default dark). `ThemeToggle` flips it.
  - **Write components dark-first with the semantic names; don't add light variants.** In the light theme `slate-950` → paper, `slate-50` → ink, `white` → ink, and `indigo-300/400`, `red-200..400`, `emerald-200/300`, `amber-300` darken for contrast. All of this comes from CSS variables (`--n-*`, `--a-*`, `--s-*`) in `globals.css`.
  - Use `text-onaccent` (always white) for text on `bg-indigo-600` or `bg-red-600` buttons, since `text-white` becomes ink in light mode.
  - For raw colors in arbitrary values, use `var(--n-ink)` with `color-mix`, not `rgb(255 255 255)`.
  - **Light theme = "gallery wall":** warm paper (`#f4f2ed`), white cards with soft shadows, ink type. The eclipse **stays dark** in light mode (black orb, ink ring, cobalt halo, cast shadow). A pale orb on pale paper had no focal point, which the user rejected. Code blocks stay dark in both themes.
  - Panels and cards use `bg-surface shadow-surface`, and form fields use `bg-field`. Don't use `bg-white/[0.02]`-style tints for surfaces: they turn into dull grey on paper.
  - Blue glow blobs get the `haze` utility, which is softened on paper. The navbar uses `bg-(--header-bg)`: solid on paper, translucent on black. Code-block shadows use `--pre-shadow`. Cover-image dark fades are `light:hidden`.
  - `dark:` / `light:` variants exist but should be rare (e.g. `dark:prose-invert`).
- **Palette is remapped in `@theme`:** `slate-*` is a neutral near-black scale and `indigo-*` is electric cobalt (`#2d52ff`). Keep using `slate`/`indigo` class names; don't add new hard-coded colors. Glow color is `rgb(45 82 255 / …)`.
- **Fonts:** `font-display` = Bodoni Moda (headlines, titles, numbers, spec values), `font-sans` = Inter (body), `font-mono` = JetBrains Mono (code).
- **Type recipes:**
  - Labels and nav: `text-[10px]`/`text-[11px] uppercase tracking-[0.25em–0.3em]`.
  - Headlines: `font-display text-5xl…8xl leading-none tracking-tight text-white`.
  - Italic serif for the second half of a headline ("Latest *stories*").
- **Building blocks** (`components/design.js`, server-safe):
  - `RevealText`: word-by-word blur-rise entrance.
  - `Eclipse`: glowing ring + dark orb (pass children to put an avatar inside).
  - `Eyebrow`: blue line + tracked label.
  - `SpecSheet`: label/serif-value columns.
  - `RailPager`
- **Other components:**
  - `components/CursorGlow.js`: pointer-following cobalt light (client).
  - `components/AuthShell.js`: split layout for all auth pages.
  - `components/ui.js`: pill buttons, dark inputs, `panelClass`.
- **CSS utilities** in `globals.css`:
  - `.reveal-word` (uses `--i` index and `--d` delay) and `.fade-in` (`--d`).
  - `.scroll-reveal`: CSS scroll-driven animation; content stays visible in browsers without `animation-timeline`.
  - `.link-sweep`: underline sweep on hover or group hover.
  - `.grain`: film-grain overlay on `<body>`.
  - `.grid-lines`: vertical grid lines. Used **only inside the home hero** (masked to fade out). They were removed from the global layout at the user's request, because they showed as light borders through the feed and footer.
- **Custom classes that set layout properties** (like `.eclipse { position: relative }`) must live in `@layer components`, otherwise they override Tailwind utilities like `absolute`.
- **Motion** respects `prefers-reduced-motion`.
- **Fluid layout:** every page container uses the `shell` utility (`globals.css`): full width, `--gutter` side padding (1.25 → 2 → 3 → 4 → 6rem at sm/lg/xl/2xl), capped at 1920px. Don't reintroduce `max-w-6xl` page wrappers. Full-bleed sections cancel the padding with `-mx-(--gutter) px-(--gutter)`. Reading text stays narrow (`max-w-3xl` prose). Hero, story rows and titles have `xl:`/`2xl:` size steps.
- **Responsive:** verified at 320 / 375 / 414 / 768 / 1024 / 1280 / 1440 / 1920px on every page, with no sideways scroll and no clipped text.
  - `html, body { overflow-x: clip }` is the safety net for glows. Use `clip`, not `hidden`, so the sticky navbar keeps working. Still keep decorative blobs inside the container (`right-0`, not `-right-40`).
  - The home hero has two `Eclipse`s: in the page flow above the headline below `lg`, and absolutely positioned behind it on `lg+`. That way the ring never covers the paragraph on tablets.
  - Story rows use 1 column on phones, `2.5rem / 1fr / 11rem` from `md`, and `4rem / 1fr / 16rem` from `lg`.
  - The editor title is an auto-growing `<textarea>` (`[field-sizing:content]`, Enter blocked), so long titles wrap on phones.
- **Screenshots:** full-page screenshots show rows below the fold as invisible, because `.scroll-reveal` only animates in on scroll. Scroll first, then screenshot.

## Gotchas / lessons learned

- **Why `posts/[idOrSlug]`:** Next.js forbids sibling `[slug]` and `[id]` folders. GET treats the segment as a slug; PUT and DELETE treat it as an id.
- **Why there's no `loading.js` on post, tag or profile pages:** a Suspense boundary above a page that calls `notFound()` makes Next stream a **200** instead of a 404. `loading.js` exists only on `(feed)` and `tags`, which never call `notFound()`. The `(feed)` route group exists for this reason.
- **The `/editor/[id]` 403** is rendered by the server gate page, which returns HTTP 200 with a 403 message. The API is the real enforcement point.
- **Don't run `next build` while `next dev` is running.** They share `.next` and corrupt it (`Unexpected end of JSON input` on start). On Windows, stopping `npx next dev` can leave an orphan `node ... start-server.js` holding port 3000. Kill it by PID.
- **The scripts import lib files via relative paths** (`../lib/pg-options.js`, `../lib/slug.js`, `../lib/excerpt.js`), which is why `package.json` has `"type": "module"`. Those three files must stay free of `@/` and extensionless imports.
- **Never run a query at module scope.** `sql` connects lazily, and `requireEnv('DATABASE_URL')` would throw during `next build`. That's why the reusable fragments (`listColumns()`, `authorJson()`, …) are functions.
- **postgres.js fragments:** nest them with `` sql`… ${cond ? sql`and …` : sql``}` ``. Build a fresh fragment per query (`findPublishedPage` takes a `where` *function* because the page query and the count query each need their own).
- **`count(*)` is `bigint`, and postgres.js returns it as a string.** Always cast with `::int`.
- **`postgres` is in `serverExternalPackages`** (`next.config.mjs`).
- **`middleware.js` runs on the edge.** Only import edge-safe modules there (`lib/jwt.js`, not `lib/auth.js` or `lib/db.js`).
- **`useSearchParams()` in client pages** must sit inside `<Suspense>` (see `app/login/page.js`).
- **Never use the direct host `db.<ref>.supabase.co` on Vercel.** It only has an IPv6 (AAAA) record, Vercel functions are IPv4-only, and every query fails at once with 503. It works from a home PC that has IPv6, which hides the problem locally. Always use the pooler URI (`postgres.<ref>@aws-0-<region>.pooler.supabase.com:6543`).
- **"Database unavailable" / 503:** the server log line `[api] Database unavailable (<reason>)` names the cause:
  - `cannot reach the server`: wrong host, or the Supabase project is paused (free projects pause after 7 idle days; resume them in the dashboard).
  - `login rejected` / `Tenant or user not found`: wrong password or project ref in `DATABASE_URL`.
  - `tables are missing`: run `npm run db:setup`.
- **Why the move off MongoDB (2026-10-17):** Atlas started rejecting connections (TLS alert 80) because this machine's IP was no longer on the Atlas Network Access list. The user chose to migrate rather than re-allowlist.
- **Windows PowerShell 5.1 `echo … >> file` writes UTF-16LE.** GitHub's "create a repo" quick-start (`echo "# Devlog" >> README.md`) once appended a NUL-laden line to README.md, which made git/grep treat it as binary. Use the Edit/Write tools, or `Out-File -Encoding utf8`.
- **Local Postgres on Windows** may default to `WIN1252` encoding, and then the seed fails on `♥`/emoji. Create the DB with `--encoding=UTF8`. Supabase is always UTF-8.
- **Testing OTP locally without SMTP:** start dev with `SMTP_HOST=` (empty) and read the code from the terminal (`[DevLog] SMTP not configured — email not sent`). `next start` runs with NODE_ENV=production, so it needs real SMTP (without it, register → 502).
  - The code is printed by `after()` a moment *after* the response, so tests should wait about 0.5 s before reading the log.
- **Testing the Redis cache without Upstash:** point `UPSTASH_REDIS_REST_URL` at a small mock that speaks Upstash's REST protocol. It must handle:
  - a POST with a JSON command array, and `/pipeline`
  - `{ result }` replies, base64-encoded when the request has `Upstash-Encoding: base64` (except `"OK"`)
  - `get`, `set` (ex/nx), `mget`, `incr`, `del`
  - Use `retry: { retries: 0 }` for no retries; `retry: false` actually tries twice.
- **Pages with `loading.js` stream:** read the whole body (`res.text()`) before assuming a server render has finished (and finished writing to the cache).
- **Speed facts (2026-10-17):**
  - bcrypt cost 12 is about 285 ms with `bcryptjs`. Native `@node-rs/bcrypt` is about 209 ms, which wasn't worth a native dependency.
  - Gmail SMTP takes about 2–5 s per email, which is why it runs in `after()`.
  - Function ↔ DB distance matters most: `iad1` → Singapore is about 220 ms per query.
- **Old JWTs** carry Mongo ObjectId `sub`s. `findUserById` rejects non-UUIDs, so those sessions simply read as logged out.
- **Writing files through a bash heredoc can collapse `\\` → `\`.** Prefer the Write/Edit tools for JS that contains regexes.

## Deployment (not done yet)

1. Supabase: create the project, copy the **Transaction pooler** URI (port 6543), and run `npm run db:setup` against it. No IP allowlist is needed.
2. Push to GitHub and import the repo into Vercel.
3. Set `DATABASE_URL`, `JWT_SECRET` (new), `NEXT_PUBLIC_APP_URL` and the `SMTP_*` / `EMAIL_FROM` vars for Production and Preview.
4. Deploy, then run `DATABASE_URL="<supabase pooler uri>" npm run seed` once.
5. Check the site logged out and logged in, then add the URL to README.md.

## Other docs

- `README.md`: setup, env vars, full API reference, Postman/curl examples, deploy guide.
- `PLAN.md`: the original phase-by-phase implementation plan.
