# DevLog

A full-stack developer blogging platform: write posts in Markdown with live preview, publish them with syntax-highlighted code, tag them, and browse by tag or search.

Frontend and backend are one **Next.js 15** app (App Router, JavaScript). The REST API is implemented as Route Handlers under `app/api/**`, so there is no separate server.

**Live demo:** _not deployed yet. Add your Vercel URL here after following [Deploy to Vercel](#deploy-to-vercel)._

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, JavaScript) |
| Database | Supabase Postgres via [`postgres`](https://github.com/porsager/postgres) (postgres.js), plain SQL |
| API | REST Route Handlers in `app/api/**` |
| Auth | JWT (HS256, `jose`) in an **httpOnly cookie**; `Authorization: Bearer` also accepted |
| Passwords | `bcryptjs` (12 rounds) |
| Styling | Tailwind CSS v4 + `@tailwindcss/typography` |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-sanitize` + `rehype-highlight` |

## Quick start (local)

Prerequisites: **Node.js 18.18+** (20 LTS or newer recommended) and a Postgres database: a free [Supabase](https://supabase.com) project, or any local Postgres 13+.

```bash
git clone <your-repo-url> devlog
cd devlog
npm install
cp .env.example .env.local        # then edit the values (see below)
npm run db:setup                  # creates the tables (db/schema.sql)
npm run seed                      # optional: 2 users, 8 posts, 5 tags
npm run dev                       # http://localhost:3000
```

### Supabase setup

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) and save the **database password** you choose.
2. Click **Connect** in the top bar → **Connection string** → copy the **Transaction pooler** URI (host `…pooler.supabase.com`, port `6543`). It works over IPv4, from your machine and from Vercel. The "Direct connection" host is IPv6-only on the free plan.
3. Put it in `.env.local` as `DATABASE_URL=…`, replacing `[YOUR-PASSWORD]` with the password from step 1. No quotes and no trailing `;`. If the password has `@`, `#`, `/` or `:` in it, URL-encode those characters.
4. Run `npm run db:setup`. (Or paste `db/schema.sql` into Supabase's **SQL Editor** and run it.)

Row Level Security is enabled on every table with no policies. The app connects as the database owner, which bypasses RLS. Supabase's public Data API (the `anon`/`authenticated` keys) can't read anything, password hashes included. This app doesn't use Supabase Auth or the Supabase JS client; it only uses Supabase as a Postgres host.

Free Supabase projects **pause after a week with no activity**. Resume them from the dashboard. While paused, the API answers `503`.

Seed accounts (password `password123` for both): `maya@devlog.dev` and `leo@devlog.dev`.

Production build:

```bash
npm run build
npm start
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string. Supabase: the Transaction pooler URI, e.g. `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`. Local: `postgres://postgres:postgres@localhost:5432/devlog` (SSL is used for every non-localhost host). |
| `JWT_SECRET` | yes | Long random string used to sign JWTs. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `NEXT_PUBLIC_APP_URL` | recommended | Public base URL, no trailing slash (e.g. `http://localhost:3000`). Used for canonical/OpenGraph URLs. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | production | SMTP server for OTP emails. For Gmail: `smtp.gmail.com`, `587`, your address, and an [App Password](https://myaccount.google.com/apppasswords) (2-Step Verification must be on). |
| `EMAIL_FROM` | optional | Sender, e.g. `"DevLog <you@gmail.com>"`. Defaults to `SMTP_USER`. |

**No SMTP in development?** Leave the `SMTP_*` values empty. The OTP is then printed in the terminal running `npm run dev` (look for `[DevLog] SMTP not configured`), so you can still sign up locally. In production, sending fails with an error if SMTP isn't configured.

`.env.example` is committed. `.env.local` is git-ignored. If `DATABASE_URL` or `JWT_SECRET` is missing, the server **refuses to start**: `instrumentation.js` throws `Missing required environment variable(s): …`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run db:setup` | Creates or updates the tables, indexes and RLS from `db/schema.sql`. Idempotent. |
| `npm run seed` | Applies the schema, then seeds 2 users, 8 posts (7 published, 1 draft, several with fenced code blocks) across 5 tags, plus 10 likes and 6 comments, in one transaction. Idempotent: it only replaces the two seed users and their posts. |

## Project structure

```
app/
  (feed)/page.js             /           feed + search          (Server Component)
  post/[slug]/page.js        /post/:slug  Markdown post          (Server Component)
  tag/[slug]/page.js         /tag/:slug                          (Server Component)
  tags/page.js               /tags                               (Server Component)
  profile/[id]/page.js       /profile/:id                        (Server Component)
  login, register            auth forms                          (Client)
  dashboard                  my drafts + published               (Client)
  editor/new                 new post                            (Client)
  editor/[id]                server ownership gate → client editor
  settings                   profile + password                  (Client)
  api/**/route.js            REST API
components/                  Navbar, PostCard, PostList, TagPill, MarkdownEditor,
                             MarkdownRenderer, AuthForm, LoadingSpinner, EmptyState,
                             ErrorMessage, ConfirmDialog, PostEditor, TagInput, …
context/AuthContext.js       useAuth(), hydrated from /api/auth/me
db/schema.sql                tables, constraints, indexes, RLS (idempotent)
lib/
  db.js                      cached postgres.js pool (globalThis) → `sql` tagged template
  pg-options.js              connection options shared with scripts/ (SSL, pooler)
  users.js                   the only module that touches password hashes
  auth.js                    getAuthUser(request), requireAuth(request), cookie helpers
  jwt.js                     sign/verify with jose (edge-safe, used by middleware)
  api.js                     handler() wrapper → { error } JSON, HttpError, validators
  data.js                    read queries shared by Server Components and the API
  posts.js                   create/update logic (slugs, tags, excerpt, publish rules)
  engagement.js, otp.js      likes/comments, one-time codes
  slug.js, tags.js           slug generation + tag upsert
middleware.js                edge JWT check for /dashboard, /editor/*, /settings
scripts/db-setup.js          applies db/schema.sql
scripts/seed.js              seed data
```

## How it works

### Authentication
- **Email OTP verification:** sign-up creates an *unverified* account and emails a 6-digit code. The account can't log in until `POST /api/auth/verify-email` accepts the code; that call also logs the user in. Logging in with the right password but an unverified email returns `403 { requiresVerification: true }` and sends a fresh code, and the UI sends the user to `/verify-email`.
- **Forgot password:** `/forgot-password` emails a reset code; entering it plus a new password resets it and logs the user in.
- **OTP rules:** codes are 6 digits, expire after 10 minutes, and are single-use. Each code is tied to its purpose, so a verification code can't reset a password. Only an HMAC-SHA256 of each code is stored, and expired codes are swept whenever a new one is issued. Resends have a 60-second cooldown (`429`), enforced inside the upsert, so it's race-free. After 5 wrong attempts the code is locked, and the counter is updated atomically (`update … set attempts = attempts + 1 … returning`). The forgot-password and resend endpoints give the same response whether or not an account exists.
- Once verified (or on login), the server signs a JWT (`sub` = user id, 7-day expiry). It sets the token as an **httpOnly, SameSite=Lax** cookie (`Secure` in production) and also returns it in the JSON body for API clients.
- `lib/auth.js#getAuthUser(request)` reads `Authorization: Bearer <token>` first, then falls back to the cookie. It verifies the signature and expiry and loads the user from Postgres. Every protected handler calls `requireAuth(request)`.
- `middleware.js` verifies the cookie at the edge and redirects `/dashboard`, `/editor/*` and `/settings` to `/login?from=<path>`. The API still re-checks auth itself; it never relies on middleware.
- `AuthContext` only caches the current user for the navbar. The cookie is the source of truth, and nothing is stored in `localStorage`.

### Security guarantees
- **Passwords**: hashed with bcrypt in `lib/users.js`. It's the only module that reads `users.password`, and only to compare it. Every query there selects an explicit column list without the hash, and every user response goes through an explicit allow-list (`publicUser()`). Public profiles don't expose email either.
- **SQL injection**: every query is a postgres.js tagged template, so values are always sent as bind parameters and never spliced into SQL text. Search terms are escaped for `ILIKE`.
- **Ownership**: `PUT` and `DELETE /api/posts/:id` load the post and compare `post.author_id` to the authenticated user id, returning **403** on a mismatch. `author`, `slug` and `publishedAt` are never read from the request body. `/editor/[id]` also re-checks ownership server-side before sending any post data to the browser.
- **Drafts**: every public query in `lib/data.js` hard-codes `status: 'published'` (feed, search, tag pages, profiles, post by slug, tag counts). Draft URLs return 404.
- **Markdown**: raw HTML is never rendered (no `rehype-raw`), and the tree also passes through `rehype-sanitize`. `<script>`, `onerror=`, `javascript:` links and iframes are all stripped. Cover and avatar URLs must be `http(s)`.
- **Errors**: every handler is wrapped by `handler()`, so errors always come back as `{ "error": "message" }` JSON with 400/401/403/404/409/500. Unknown `/api/*` paths return a JSON 404.

### Likes, comments and sharing
- **Likes:** one `Like` document per user and post, enforced by a unique index. Liking twice (even in parallel) counts once. `Post.likeCount` is updated atomically with `$inc`.
- **Comments:** plain text only (React escapes it, so HTML in a comment shows as text), up to 2,000 characters, oldest first. The first page is server-rendered on the post page. You can delete your own comments; a post's author can delete any comment on their post.
- **Published posts only:** liking or commenting on a draft returns 404, the same as a missing post. Deleting a post deletes its likes and comments.
- **Share:** on phones the Share button opens the native share sheet (Web Share API). On desktop it shows a menu with Copy link, X, LinkedIn, Facebook, WhatsApp and Email.

### Light / dark mode
- The toggle is the sun/moon button in the navbar (and in the ☰ menu on small phones). The choice is saved in `localStorage` (`devlog-theme`); the default is dark.
- An inline script in `<head>` applies the saved theme before the first paint, so there's no flash on load.
- Themes swap the palette through CSS variables (`[data-theme]` in `app/globals.css`). Components use the same class names in both modes.

### Slugs and tags
- Slugs come from the title (lowercased, hyphenated, accents stripped). A collision gets a numeric suffix: `hello-world`, `hello-world-2`, …
- While a post is a draft its slug follows the title. After first publish the slug is frozen so links don't break.
- Tags are sent by **name** (max 5). They are lowercased and deduplicated, an existing tag is reused when the name (or slug) matches, and otherwise a new one is created.

### Rendering
- Public pages are **Server Components** that call `lib/data.js` directly instead of fetching their own API over HTTP. Posts are fully server-rendered with `<title>`, description and OpenGraph tags, so they're SEO-friendly and ship no Markdown parser to readers.
- Authoring pages are **Client Components** that call the REST API with `fetch(..., { credentials: 'include' })`.

## API reference

Base URL: `/api`. Request and response bodies are JSON. Protected routes accept either the `devlog_token` cookie or `Authorization: Bearer <token>`.

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | public | Create an unverified account and email an OTP → `201 { requiresVerification, email }` (no session yet) |
| POST | `/api/auth/verify-email` | public | `{ email, otp }` → verifies the email → `{ user, token }` + cookie |
| POST | `/api/auth/resend-otp` | public | `{ email }` → new verification code (`429` within 60s) |
| POST | `/api/auth/login` | public | Log in → `{ user, token }` + cookie; `403 { requiresVerification }` if the email isn't verified |
| POST | `/api/auth/forgot-password` | public | `{ email }` → emails a reset code (generic response) |
| POST | `/api/auth/reset-password` | public | `{ email, otp, newPassword }` → `{ user, token }` + cookie |
| POST | `/api/auth/logout` | public | Clear the cookie |
| GET | `/api/auth/me` | protected | Current user |
| GET | `/api/posts` | public | Published posts, newest first. Query: `search` (title, case-insensitive), `tag` (slug or name), `page`, `limit` (≤ 50) |
| GET | `/api/posts/:slug` | public | One **published** post with content (404 for drafts) |
| POST | `/api/posts` | protected | Create post → `201 { post }` |
| PUT | `/api/posts/:id` | protected, **owner only** | Partial update → `{ post }` |
| DELETE | `/api/posts/:id` | protected, **owner only** | Delete → `{ message, id }` |
| GET | `/api/posts/mine` | protected | Caller's drafts + published posts |
| GET | `/api/tags` | public | All tags with `postCount` (published posts only) |
| GET | `/api/tags/:slug/posts` | public | `{ tag, posts, pagination }`, published only |
| GET | `/api/users/:id` | public | `{ user, posts, pagination }`: profile (no email) + published posts |
| PUT | `/api/users/me` | protected | Update `name`, `bio`, `avatarUrl`; optional `currentPassword` + `newPassword` |
| GET | `/api/posts/:id/like` | public | `{ liked, likeCount }` (`liked` is false when logged out) |
| POST | `/api/posts/:id/like` | protected | Like; idempotent → `{ liked: true, likeCount }` |
| DELETE | `/api/posts/:id/like` | protected | Unlike; idempotent → `{ liked: false, likeCount }` |
| GET | `/api/posts/:id/comments` | public | `{ comments, pagination }`, oldest first; `?page=&limit=` (≤ 50) |
| POST | `/api/posts/:id/comments` | protected | `{ content }` (plain text, 1–2000 chars) → `201 { comment }`; `429` if you post again within 3s |
| DELETE | `/api/comments/:id` | protected | Allowed for the comment's author **or** the post's author; anyone else gets `403` |

> Next.js doesn't allow sibling `[slug]` and `[id]` folders, so `GET /api/posts/:slug` and `PUT`/`DELETE /api/posts/:id` share one handler file: `app/api/posts/[idOrSlug]/route.js`. `GET` treats the segment as a slug, and `PUT`/`DELETE` treat it as an id.

**Post body** (`POST`, and any subset for `PUT`):

```json
{
  "title": "Hello World",
  "content": "## Markdown\n\n```js\nconsole.log('hi')\n```",
  "excerpt": "Optional, ≤ 250 chars — auto-generated from content if empty",
  "coverImage": "https://example.com/cover.png",
  "status": "draft",
  "tags": ["javascript", "react"]
}
```

`status` is `"draft"` (default) or `"published"`. Publishing requires non-empty content and sets `publishedAt` the first time.

**Status codes**

| Code | When |
| --- | --- |
| 400 | Validation failure or malformed JSON |
| 401 | Missing, invalid or expired token |
| 403 | Authenticated but not the post's owner |
| 404 | Post, tag, user or route not found (including drafts on public routes) |
| 403 | Also returned when logging in with an unverified email (`requiresVerification: true`) |
| 409 | Email already registered |
| 429 | OTP resend cooldown, or too many wrong codes |
| 500 | Unexpected server error (details logged server-side, never sent to the client) |
| 502 | The OTP email couldn't be sent (SMTP error) |
| 503 | Database unreachable, login rejected, project paused, or tables missing (the server log says which; check `DATABASE_URL` / run `npm run db:setup`). Fails after at most about 8 seconds |

Every error body looks like `{ "error": "message" }`.

### Testing with Postman / curl

```bash
# new account? register, then verify with the emailed (or console-printed) code:
#   POST /api/auth/register      {"name":"Me","email":"me@x.dev","password":"password123"}
#   POST /api/auth/verify-email  {"email":"me@x.dev","otp":"123456"}   → returns token
# existing (seeded) account: log in and grab the token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"maya@devlog.dev","password":"password123"}' | jq -r .token)

# protected route without a token → 401
curl -i http://localhost:3000/api/auth/me

# create a draft
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"My first post","content":"Hello **world**","tags":["intro"]}'
```

In Postman, set **Authorization → Bearer Token** to the `token` returned by login.

## Deploy to Vercel

1. **Supabase**: create the project and run `npm run db:setup` against it (see [Supabase setup](#supabase-setup)). Use the **Transaction pooler** URI (port `6543`), which is the one meant for serverless functions. No IP allowlist is needed.
2. **Push this repo to GitHub**, then import it at [vercel.com/new](https://vercel.com/new). The framework preset (Next.js) is auto-detected.
3. **Environment variables** (Project → Settings → Environment Variables, for Production and Preview):
   - `DATABASE_URL`: the Supabase Transaction pooler URI
   - `JWT_SECRET`: a new random secret (don't reuse your local one)
   - `NEXT_PUBLIC_APP_URL`: e.g. `https://devlog-yourname.vercel.app`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`: required, or sign-up emails fail
4. **Deploy.** Then seed the production database once from your machine:
   ```bash
   DATABASE_URL="<supabase pooler uri>" npm run seed
   ```
5. Check the live URL logged out (feed, a post, `/tags`), then log in as `maya@devlog.dev` and write, publish, edit and delete a post.

Alternatively, use the CLI: `npx vercel` (link the project), `npx vercel env add …`, then `npx vercel --prod`.

## Verification checklist

These were checked against both `next dev` and the production build (`next build && next start`):

- Register/login return a token and set an httpOnly cookie; the stored password is a `$2a$12$…` bcrypt hash; no response contains `password` or a hash.
- A protected route without a token, or with a bad one, returns 401.
- Full post CRUD works. A second user gets **403** on `PUT`/`DELETE`, and the post is unchanged.
- A draft is absent from `/api/posts`, search, tag endpoints, profiles, the feed and `/post/:slug` (404).
- Slug collisions get `-2`; tags are upserted and reused; `author` in a request body is ignored.
- Markdown renders headings, emphasis, links, lists, GFM tables and highlighted fenced code. `<script>`, `onerror`, `javascript:` and `<iframe>` are stripped.
- Middleware redirects logged-out users from `/dashboard`, `/editor/*` and `/settings` to `/login?from=…`. A non-owner opening `/editor/:id` sees a 403 page and no post data.
- Browser flow works: register → write a draft → publish → appears on the feed → edit → update the profile → delete via the confirm dialog → log out.
- No horizontal scroll at 375px on any page; no browser console errors.
#   D e v l o g  
 