-- DevLog schema for Postgres (Supabase). Idempotent: safe to run again.
-- Applied by `npm run db:setup` (and by `npm run seed`), or paste it into the
-- Supabase SQL editor.
--
-- Row Level Security is enabled on every table with NO policies. The app
-- connects with the database owner role (which bypasses RLS), while Supabase's
-- auto-generated Data API (anon / authenticated keys) can read nothing,
-- in particular not users.password.

create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 1 and 60),
  email          text not null unique check (email = lower(email)),
  password       text not null, -- bcrypt hash; never selected outside lib/users.js
  bio            text not null default '' check (char_length(bio) <= 200),
  avatar_url     text not null default '',
  email_verified boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(name) between 1 and 30 and name = lower(name)),
  slug       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 150),
  slug          text not null unique,
  content       text not null default '' check (char_length(content) <= 100000),
  excerpt       text not null default '' check (char_length(excerpt) <= 250),
  cover_image   text not null default '',
  status        text not null default 'draft' check (status in ('draft', 'published')),
  published_at  timestamptz, -- set on first publish; orders the feed
  author_id     uuid not null references users (id) on delete cascade,
  -- Denormalized counters, changed only by lib/engagement.js.
  like_count    integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists posts_feed_idx on posts (status, published_at desc, id desc);
create index if not exists posts_author_idx on posts (author_id, updated_at desc);

-- A post's tags, in the order the author entered them.
create table if not exists post_tags (
  post_id  uuid not null references posts (id) on delete cascade,
  tag_id   uuid not null references tags (id) on delete cascade,
  position smallint not null default 0,
  primary key (post_id, tag_id)
);
create index if not exists post_tags_tag_idx on post_tags (tag_id);

-- One row per (post, user): the primary key makes liking idempotent and race-safe.
create table if not exists likes (
  post_id    uuid not null references posts (id) on delete cascade,
  user_id    uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists likes_user_idx on likes (user_id);

-- Plain-text comments (rendered as text, never as HTML/Markdown).
create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts (id) on delete cascade,
  author_id  uuid not null references users (id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comments_post_idx on comments (post_id, created_at, id);
create index if not exists comments_author_idx on comments (author_id, created_at desc);

-- One active one-time code per (email, purpose). Only an HMAC of the code is stored.
-- Expired rows are swept by lib/otp.js whenever a new code is issued.
create table if not exists otps (
  email        text not null,
  purpose      text not null check (purpose in ('verify-email', 'reset-password')),
  code_hash    text not null,
  expires_at   timestamptz not null,
  attempts     integer not null default 0,
  last_sent_at timestamptz not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (email, purpose)
);
create index if not exists otps_expires_idx on otps (expires_at);

alter table users     enable row level security;
alter table tags      enable row level security;
alter table posts     enable row level security;
alter table post_tags enable row level security;
alter table likes     enable row level security;
alter table comments  enable row level security;
alter table otps      enable row level security;
