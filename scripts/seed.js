/**
 * Seeds DevLog with 2 users, 8 posts (1 draft) across 5 tags.
 *
 *   npm run seed
 *
 * Idempotent: it removes only the two seed users (their posts, likes and
 * comments go with them via ON DELETE CASCADE) before re-creating them, so it
 * is safe to run against a database with other data. It applies
 * db/schema.sql first, so it also works on an empty database.
 * Loads DATABASE_URL from .env.local (or .env / the environment).
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { pgOptions } from '../lib/pg-options.js';
import { slugify } from '../lib/slug.js';
import { excerptFromMarkdown } from '../lib/excerpt.js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('✖ DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}

const BCRYPT_ROUNDS = 12; // same as lib/users.js
const sql = postgres(process.env.DATABASE_URL, { ...pgOptions(process.env.DATABASE_URL), max: 1 });

const F = '```'; // code fence, to keep the template literals below readable
const DAY = 24 * 60 * 60 * 1000;

const USERS = [
  {
    key: 'maya',
    name: 'Maya Chen',
    email: 'maya@devlog.dev',
    password: 'password123',
    bio: 'Frontend engineer. I write about React, Next.js and making the web fast.',
  },
  {
    key: 'leo',
    name: 'Leo Okafor',
    email: 'leo@devlog.dev',
    password: 'password123',
    bio: 'Backend & data. MongoDB, Node.js, and the occasional CSS rant.',
  },
];

const TAGS = ['javascript', 'react', 'nextjs', 'mongodb', 'css'];

const POSTS = [
  {
    author: 'maya',
    title: 'Understanding React Server Components',
    tags: ['react', 'nextjs'],
    daysAgo: 1,
    cover: 'https://picsum.photos/seed/devlog-rsc/1200/600',
    content: `Server Components let you render parts of your UI **on the server only**, shipping zero JavaScript for them.

## Why they matter

- Data fetching happens next to your data source
- Large dependencies (like Markdown parsers) never reach the browser
- Client Components are still there for interactivity

## A minimal example

${F}jsx
// app/posts/page.js — a Server Component (the default)
import { listPosts } from '@/lib/data';

export default async function PostsPage() {
  const posts = await listPosts(); // runs on the server
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
${F}

Need state or event handlers? Add \`'use client'\` at the top of the file:

${F}jsx
'use client';
import { useState } from 'react';

export default function LikeButton() {
  const [likes, setLikes] = useState(0);
  return <button onClick={() => setLikes(likes + 1)}>♥ {likes}</button>;
}
${F}

| Concern | Server Component | Client Component |
| --- | --- | --- |
| Fetch data directly | ✅ | ❌ (use an API) |
| useState / useEffect | ❌ | ✅ |
| Ships JS to browser | ❌ | ✅ |

Read more in the [Next.js docs](https://nextjs.org/docs/app/building-your-application/rendering/server-components).`,
  },
  {
    author: 'maya',
    title: 'Five JavaScript Array Methods I Use Every Day',
    tags: ['javascript'],
    daysAgo: 3,
    content: `Modern JavaScript arrays are *incredibly* expressive. Here are the five methods I reach for most.

### 1. \`map\`

${F}js
const prices = [10, 20, 30];
const withTax = prices.map((p) => p * 1.2);
${F}

### 2. \`filter\`

${F}js
const published = posts.filter((post) => post.status === 'published');
${F}

### 3. \`reduce\`

${F}js
const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
${F}

### 4. \`find\`

${F}js
const admin = users.find((u) => u.role === 'admin');
${F}

### 5. \`at\`

${F}js
const last = items.at(-1); // no more items[items.length - 1]
${F}

> **Tip:** chain them, but keep each step small enough to read at a glance.`,
  },
  {
    author: 'leo',
    title: 'Mongoose Connection Caching in Next.js',
    tags: ['mongodb', 'nextjs', 'javascript'],
    daysAgo: 2,
    cover: 'https://picsum.photos/seed/devlog-mongo/1200/600',
    content: `In development, Next.js hot-reloads modules on every change. If you call \`mongoose.connect()\` at module scope you'll open a **new connection pool on every reload** and eventually hit Atlas connection limits.

## The fix: cache on \`globalThis\`

${F}js
import mongoose from 'mongoose';

let cached = globalThis.__mongoose;
if (!cached) cached = globalThis.__mongoose = { conn: null, promise: null };

export default async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
${F}

\`globalThis\` survives module re-evaluation, so every request reuses the same pool.

## Checklist

1. Call \`connectDB()\` at the top of every route handler
2. Set \`bufferCommands: false\` so queries fail fast instead of hanging
3. Reset the cached promise if the connection throws`,
  },
  {
    author: 'leo',
    title: 'Indexing Strategies for MongoDB Feeds',
    tags: ['mongodb'],
    daysAgo: 5,
    content: `A blog feed query usually looks like this:

${F}js
db.posts.find({ status: 'published' }).sort({ publishedAt: -1 }).limit(10);
${F}

Without an index MongoDB scans every document. Add a **compound index** that matches the filter *and* the sort:

${F}js
db.posts.createIndex({ status: 1, publishedAt: -1 });
${F}

Then confirm it's used:

${F}bash
mongosh "$MONGODB_URI" --eval 'db.posts.find({status:"published"}).sort({publishedAt:-1}).explain("executionStats")'
${F}

Look for \`IXSCAN\` instead of \`COLLSCAN\` in the winning plan.

## Rules of thumb

- **Equality** fields first, then **sort** fields, then **range** fields (the ESR rule)
- Every index costs write performance — don't index everything
- Use \`explain()\` before and after`,
  },
  {
    author: 'maya',
    title: 'Modern CSS Layout with Grid and Container Queries',
    tags: ['css'],
    daysAgo: 7,
    cover: 'https://picsum.photos/seed/devlog-css/1200/600',
    content: `Media queries respond to the *viewport*. Container queries respond to the **component's own size** — which is what you usually want.

${F}css
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 1.5rem;
}

.card {
  container-type: inline-size;
}

@container (min-width: 28rem) {
  .card__body {
    display: grid;
    grid-template-columns: 8rem 1fr;
  }
}
${F}

Browser support is now excellent across Chrome, Firefox and Safari. ~~Polyfills~~ are no longer needed.`,
  },
  {
    author: 'leo',
    title: 'Building a REST API with Next.js Route Handlers',
    tags: ['nextjs', 'javascript'],
    daysAgo: 4,
    content: `Route Handlers live in \`app/api/**/route.js\` and export one function per HTTP method.

${F}js
// app/api/posts/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const search = request.nextUrl.searchParams.get('search') ?? '';
  const posts = await listPosts({ search });
  return NextResponse.json({ posts });
}
${F}

## Consistent errors

Wrap every handler so a thrown error becomes JSON rather than an HTML error page:

${F}js
export function handler(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      const status = err.status ?? 500;
      return NextResponse.json({ error: err.message }, { status });
    }
  };
}
${F}

Test it quickly:

${F}bash
curl -s http://localhost:3000/api/posts?search=react | jq '.posts[].title'
${F}`,
  },
  {
    author: 'maya',
    title: 'Custom React Hooks: useDebounce',
    tags: ['react', 'javascript'],
    daysAgo: 10,
    content: `Search inputs shouldn't fire a request on every keystroke. A tiny hook fixes that:

${F}jsx
import { useEffect, useState } from 'react';

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
${F}

Usage:

${F}jsx
const [query, setQuery] = useState('');
const debouncedQuery = useDebounce(query);

useEffect(() => {
  if (debouncedQuery) search(debouncedQuery);
}, [debouncedQuery]);
${F}`,
  },
  {
    author: 'leo',
    title: 'Draft: Notes on MongoDB Aggregation Pipelines',
    tags: ['mongodb'],
    status: 'draft',
    content: `Work in progress — this post is a **draft** and must never appear on public pages.

${F}js
db.posts.aggregate([
  { $match: { status: 'published' } },
  { $unwind: '$tags' },
  { $group: { _id: '$tags', count: { $sum: 1 } } },
]);
${F}

TODO: explain \`$lookup\`, \`$facet\`.`,
  },
];

// Sample discussions, keyed by post title: [authorKey, text]
const COMMENTS = {
  'Understanding React Server Components': [
    ['leo', 'The table comparing server vs client components finally made this click for me. Thanks!'],
    ['maya', 'Glad it helped! The mental model gets much easier once you stop thinking of it as SSR.'],
  ],
  'Mongoose Connection Caching in Next.js': [
    ['maya', 'Hit exactly this Atlas connection limit last month. The globalThis trick fixed it instantly.'],
  ],
  'Five JavaScript Array Methods I Use Every Day': [
    ['leo', 'Array.prototype.at(-1) is so underrated.\nAlso worth mentioning: flatMap.'],
  ],
  'Indexing Strategies for MongoDB Feeds': [
    ['maya', 'The ESR rule is a great way to remember index order.'],
    ['leo', 'Exactly — and always confirm with explain() before and after.'],
  ],
};

async function main() {
  const { host, pathname } = new URL(process.env.DATABASE_URL);
  console.log(`→ Connecting to ${host}${pathname}`);
  await sql.unsafe(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  console.log('→ Schema is up to date');

  const hashes = await Promise.all(USERS.map((u) => bcrypt.hash(u.password, BCRYPT_ROUNDS)));

  // One transaction: the seed either lands completely or not at all.
  const totals = await sql.begin(async (tx) => {
    // Remove previous seed data only (cascades to their posts, likes and comments).
    const removed = await tx`delete from users where email in ${tx(USERS.map((u) => u.email))} returning id`;
    if (removed.length) console.log(`→ Removed ${removed.length} existing seed user(s) and their posts`);

    const users = {};
    for (const [i, u] of USERS.entries()) {
      [users[u.key]] = await tx`
        insert into users (name, email, password, bio, email_verified)
        values (${u.name}, ${u.email}, ${hashes[i]}, ${u.bio}, true)
        returning id`; // seed accounts skip the OTP step
    }

    const tags = {};
    for (const name of TAGS) {
      const slug = slugify(name);
      await tx`insert into tags (name, slug) values (${name}, ${slug}) on conflict do nothing`;
      [tags[name]] = await tx`select id from tags where name = ${name} or slug = ${slug} limit 1`;
    }

    const now = Date.now();
    const created = [];
    for (const p of POSTS) {
      const status = p.status || 'published';
      const base = slugify(p.title);
      let slug = base;
      for (let n = 2; (await tx`select 1 from posts where slug = ${slug}`).length; n += 1) slug = `${base}-${n}`;

      const date = new Date(now - (p.daysAgo ?? 0) * DAY);
      const [post] = await tx`
        insert into posts (title, slug, content, excerpt, cover_image, status, published_at, author_id, created_at, updated_at)
        values (${p.title}, ${slug}, ${p.content}, ${excerptFromMarkdown(p.content)}, ${p.cover || ''}, ${status},
                ${status === 'published' ? date : null}, ${users[p.author].id}, ${date}, ${date})
        returning id, status`;
      const links = p.tags.map((t, position) => ({ post_id: post.id, tag_id: tags[t].id, position }));
      await tx`insert into post_tags ${tx(links)}`;
      created.push({ post, spec: p, date });
    }

    // Likes + a short discussion on the published posts (drafts get none).
    let likeTotal = 0;
    let commentTotal = 0;
    for (const { post, spec, date } of created) {
      if (post.status !== 'published') continue;
      const other = spec.author === 'maya' ? 'leo' : 'maya';
      const likers = [users[other]];
      if (spec.cover) likers.push(users[spec.author]); // a few posts get two likes
      await tx`insert into likes ${tx(likers.map((u) => ({ post_id: post.id, user_id: u.id })))}`;

      const thread = COMMENTS[spec.title] || [];
      for (const [i, [who, content]] of thread.entries()) {
        const at = new Date(date.getTime() + (i + 1) * 3 * 60 * 60 * 1000);
        await tx`
          insert into comments (post_id, author_id, content, created_at, updated_at)
          values (${post.id}, ${users[who].id}, ${content}, ${at}, ${at})`;
      }
      await tx`update posts set like_count = ${likers.length}, comment_count = ${thread.length} where id = ${post.id}`;
      likeTotal += likers.length;
      commentTotal += thread.length;
    }
    return { likeTotal, commentTotal };
  });

  const published = POSTS.filter((p) => (p.status || 'published') === 'published').length;
  console.log(`✔ Seeded ${USERS.length} users, ${TAGS.length} tags, ${POSTS.length} posts (${published} published, ${POSTS.length - published} draft), ${totals.likeTotal} likes, ${totals.commentTotal} comments`);
  console.log('\n  Log in with either account (password: password123):');
  for (const u of USERS) console.log(`    ${u.email}`);
}

main()
  .catch((err) => {
    console.error('✖ Seed failed:', err.message || err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
