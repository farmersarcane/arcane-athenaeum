-- Arcane Athenaeum — initial schema.
-- One row per book: metadata and ownership live together (no books/copies split).
-- Owning two physical copies of the same title means two rows sharing an ISBN;
-- duplicate detection warns at add time but never blocks it.
-- Apply to dev first, verify, then prod.

-- ---------------------------------------------------------------- profile

create table public.profile (
  id uuid primary key references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------------------------------------------------------------- shelf

-- Topic/genre organization. Distinct from tags: a shelf is where a book lives.
create table public.shelf (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------------------------------------------------------------- tag

-- Ad hoc labels ("signed copy", "gift from Mom"). Not necessarily genre.
create table public.tag (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------------------------------------------------------------- book

create table public.book (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

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

-- ---------------------------------------------------------------- RLS

alter table public.profile enable row level security;
alter table public.series enable row level security;
alter table public.shelf enable row level security;
alter table public.tag enable row level security;
alter table public.book enable row level security;
alter table public.book_shelf enable row level security;
alter table public.book_tag enable row level security;
alter table public.loan enable row level security;

create policy "Profile owned by user"
  on public.profile for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Series owned by user"
  on public.series for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Shelf owned by user"
  on public.shelf for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Tag owned by user"
  on public.tag for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Book owned by user"
  on public.book for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Book shelf scoped to parent book"
  on public.book_shelf for all to authenticated
  using (exists (select 1 from public.book b where b.id = book_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.book b where b.id = book_id and b.user_id = auth.uid()));

create policy "Book tag scoped to parent book"
  on public.book_tag for all to authenticated
  using (exists (select 1 from public.book b where b.id = book_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.book b where b.id = book_id and b.user_id = auth.uid()));

create policy "Loan scoped to parent book"
  on public.loan for all to authenticated
  using (exists (select 1 from public.book b where b.id = book_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.book b where b.id = book_id and b.user_id = auth.uid()));

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

-- ------------------------------------------- profile row on signup

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
