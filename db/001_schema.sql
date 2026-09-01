-- Arcane Athenaeum — initial schema.
-- One row per book: metadata and ownership live together (no books/copies split).
-- Owning two physical copies of the same title means two rows sharing an ISBN;
-- duplicate detection warns at add time but never blocks it.
-- Apply to dev first, verify, then prod.
--
-- Migrated from Supabase (Postgres + Auth) to Neon (Postgres) + Clerk (Auth).
-- This file has never been applied to a live database — the original Supabase
-- project for this app was never created (the owner's account had already hit
-- its 2-project free-tier cap) — so it is edited in place rather than layered
-- with a follow-up migration file. If you're reading this after it HAS been
-- applied somewhere, start layering migrations from here on instead of
-- editing this file again.
--
-- What changed vs. the Supabase version, and why:
--   * Supabase provisions its own `auth.users` table and an `authenticated`
--     Postgres role, with `auth.uid()` reading the current user's id out of
--     the request JWT. Neon has no `auth.users` table — user *authentication*
--     now happens entirely in Clerk, outside this database. Neon RLS (aka
--     "Neon Authorize") plays the equivalent role to Supabase's auth schema:
--     it verifies the Clerk-issued JWT on each connection (via the
--     `pg_session_jwt` extension) and exposes the verified subject as
--     `auth.user_id()` — Neon's direct equivalent of `auth.uid()`. It also
--     provisions the same-named `authenticated` Postgres role, so every
--     policy below only needed its function call renamed, not its shape.
--   * Clerk user ids are opaque strings (e.g. "user_2abC123..."), not UUIDs,
--     so every former `uuid ... references auth.users(id)` column is now
--     `text`, with no FK — there is no local table of users to reference.
--     `public.profile.id` is now the durable local anchor for "a user": every
--     other user-owned table FKs to `profile(id)` instead of the old
--     `auth.users(id)`, which also gives us referential integrity we didn't
--     have before (Supabase's `auth.users` lived in a different schema that
--     ordinary FKs couldn't usefully constrain against from application code
--     reasoning about it, but the *shape* — one durable per-user row every
--     other table hangs off of — is preserved and, if anything, now more
--     explicit).
--   * Supabase's `handle_new_user()` trigger fired `after insert on
--     auth.users` to create a `profile` row at signup. There is no
--     `auth.users` table in Neon for such a trigger to fire on — Clerk
--     manages the user lifecycle entirely outside this Postgres instance.
--     The replacement is an application-level upsert: `ensureProfile()` in
--     lib/db.ts runs a `insert into profile (id) values ($1) on conflict (id)
--     do nothing` for the current Clerk user id on every authenticated
--     request that reaches app/(app)/layout.tsx or a server action, before
--     any query that could depend on the row existing. This was chosen over
--     a Clerk webhook (Clerk -> POST /api/webhooks/clerk -> insert profile)
--     because it needs no extra route, no webhook signing secret, and no
--     dependency on Clerk's webhook delivery succeeding before the user's
--     first page load — it runs exactly when it's needed and is idempotent.
--     A webhook remains a reasonable future upgrade if profile ever needs to
--     react to Clerk-side events (email change, account deletion) that don't
--     otherwise touch this database.

-- ---------------------------------------------------------------- profile

create table public.profile (
  -- The Clerk user id (the JWT's `sub` claim) — opaque text, not a uuid.
  id text primary key,
  display_name text,
  -- Reserved for the public portfolio demo: the seeded demo account is flagged
  -- here so logged-out visitors can be pointed at its library. No anon read
  -- policies exist yet — they get added with the demo dataset.
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- series

create table public.series (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profile(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------------------------------------------------------------- shelf

-- Topic/genre organization. Distinct from tags: a shelf is where a book lives.
create table public.shelf (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profile(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------------------------------------------------------------- tag

-- Ad hoc labels ("signed copy", "gift from Mom"). Not necessarily genre.
create table public.tag (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profile(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------------------------------------------------------------- book

create table public.book (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profile(id) on delete cascade,

  -- Bibliographic metadata (mostly from Google Books, always user-editable)
  isbn10 text,
  isbn13 text,
  title text not null,
  subtitle text,
  authors text[] not null default '{}',
  categories text[] not null default '{}',
  publisher text,
  page_count int,
  edition text,
  format text check (format in (
    'hardcover','paperback','mass_market','board_book','audiobook','ebook','other'
  )),
  description text,
  cover_image_url text,
  google_books_id text,
  language text,
  published_date text,

  -- Ownership
  location text not null default 'shelf' check (location in ('shelf','wishlist')),
  condition text,

  -- Reading
  read_status text not null default 'unread'
    check (read_status in ('unread','reading','read')),
  date_started date,
  date_finished date,

  -- Review (scoped to the book, per the confirmed data model)
  rating int check (rating between 1 and 5),
  review_text text,
  date_reviewed date,

  -- Series
  series_id uuid references public.series(id) on delete set null,
  series_position numeric,

  -- Purchase / value. Not part of the public demo dataset.
  price_paid numeric(10,2),
  purchase_date date,
  purchased_from text,
  gift_from text,
  estimated_value numeric(10,2),

  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index book_user_idx on public.book (user_id);
create index book_deleted_at_idx on public.book (deleted_at);
create index book_location_idx on public.book (user_id, location);
create index book_read_status_idx on public.book (user_id, read_status);
create index book_series_idx on public.book (series_id);
-- Duplicate detection at scan time looks up by either ISBN form.
create index book_isbn13_idx on public.book (user_id, isbn13);
create index book_isbn10_idx on public.book (user_id, isbn10);

-- ------------------------------------------------------- book_shelf/tag

create table public.book_shelf (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.book(id) on delete cascade,
  shelf_id uuid not null references public.shelf(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (book_id, shelf_id)
);

create table public.book_tag (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.book(id) on delete cascade,
  tag_id uuid not null references public.tag(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (book_id, tag_id)
);

create index book_shelf_book_idx on public.book_shelf (book_id);
create index book_shelf_shelf_idx on public.book_shelf (shelf_id);
create index book_tag_book_idx on public.book_tag (book_id);
create index book_tag_tag_idx on public.book_tag (tag_id);

-- ---------------------------------------------------------------- loan

create table public.loan (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.book(id) on delete cascade,
  borrower_name text not null,
  date_loaned date not null default current_date,
  due_date date,
  date_returned date,
  -- Derived rather than stored independently so it can never drift from
  -- date_returned. Marking a loan returned is a single column write.
  status text generated always as (
    case when date_returned is null then 'out' else 'returned' end
  ) stored,
  notes text,
  created_at timestamptz not null default now()
);

create index loan_book_idx on public.loan (book_id);
create index loan_status_idx on public.loan (status);

-- A book can only be out to one person at a time. Past loans are unconstrained.
create unique index loan_one_active_per_book_idx
  on public.loan (book_id) where date_returned is null;

-- ------------------------------------------------------------ Neon RLS

-- Verifies the Clerk-issued JWT presented on the `authenticated` role's
-- connection and provides the auth.user_id() / auth.session() functions used
-- below. In a normal setup this is installed for you the moment you add an
-- auth provider (Clerk) under RLS/Authorize in the Neon console — this
-- statement is here so the schema file is self-sufficient and safe to
-- re-run; it is a no-op if the console already installed it.
create extension if not exists "pg_session_jwt";

-- Table privileges. RLS policies decide *which rows* a query can touch, but
-- Postgres still checks ordinary table grants first — without these, every
-- query from the `authenticated` role fails with permission denied before
-- RLS is ever evaluated. (Supabase grants these automatically for you;
-- Neon's console setup may already cover it too, but these are included
-- explicitly, and idempotently, so the schema doesn't depend on that.)
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profile, public.series, public.shelf, public.tag,
  public.book, public.book_shelf, public.book_tag, public.loan
  to authenticated;

alter table public.profile enable row level security;
alter table public.series enable row level security;
alter table public.shelf enable row level security;
alter table public.tag enable row level security;
alter table public.book enable row level security;
alter table public.book_shelf enable row level security;
alter table public.book_tag enable row level security;
alter table public.loan enable row level security;

-- auth.user_id() resolves the `sub` claim of the current connection's Clerk
-- JWT — the same authorization boundary Supabase's auth.uid() enforced, just
-- sourced from Clerk's token instead of Supabase's. Every policy below is
-- otherwise unchanged from the Supabase version.

create policy "Profile owned by user"
  on public.profile for all to authenticated
  using ((select auth.user_id()) = id)
  with check ((select auth.user_id()) = id);

create policy "Series owned by user"
  on public.series for all to authenticated
  using ((select auth.user_id()) = user_id)
  with check ((select auth.user_id()) = user_id);

create policy "Shelf owned by user"
  on public.shelf for all to authenticated
  using ((select auth.user_id()) = user_id)
  with check ((select auth.user_id()) = user_id);

create policy "Tag owned by user"
  on public.tag for all to authenticated
  using ((select auth.user_id()) = user_id)
  with check ((select auth.user_id()) = user_id);

create policy "Book owned by user"
  on public.book for all to authenticated
  using ((select auth.user_id()) = user_id)
  with check ((select auth.user_id()) = user_id);

create policy "Book shelf scoped to parent book"
  on public.book_shelf for all to authenticated
  using (exists (select 1 from public.book b where b.id = book_id and b.user_id = (select auth.user_id())))
  with check (exists (select 1 from public.book b where b.id = book_id and b.user_id = (select auth.user_id())));

create policy "Book tag scoped to parent book"
  on public.book_tag for all to authenticated
  using (exists (select 1 from public.book b where b.id = book_id and b.user_id = (select auth.user_id())))
  with check (exists (select 1 from public.book b where b.id = book_id and b.user_id = (select auth.user_id())));

create policy "Loan scoped to parent book"
  on public.loan for all to authenticated
  using (exists (select 1 from public.book b where b.id = book_id and b.user_id = (select auth.user_id())))
  with check (exists (select 1 from public.book b where b.id = book_id and b.user_id = (select auth.user_id())));

-- ---------------------------------------------------- updated_at trigger

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger book_touch_updated_at
  before update on public.book
  for each row execute function public.touch_updated_at();

-- profile rows are no longer created by a Supabase `auth.users` trigger —
-- see ensureProfile() in lib/db.ts, called from app/(app)/layout.tsx and
-- app/actions/_auth.ts's requireUser() before any query that assumes the
-- row exists.
