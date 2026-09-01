# Arcane Athenaeum

A personal book catalog: every book you own, organized into shelves, and every
book you want, on a wishlist. Barcode/ISBN lookup via Google Books, star
ratings and reviews, ad hoc tags, reading status, series tracking, purchase and
value records, and a loan tracker.

Built on the Makers Arcane brand system. Portfolio companion to
`dustinwillis.pro/arcane-athenaeum`; the app itself is intended for
`arcane-athenaeum.dustinwillis.pro`.

## Stack

- Next.js 16.3 (App Router) + React 19, TypeScript
- Tailwind CSS 4 (brand palette declared in `@theme` in `app/globals.css`)
- Supabase (Postgres + Auth), its own isolated project
- Google Books API for ISBN lookup
- Native `BarcodeDetector` where available, `@zxing/browser` as fallback

Note: Next 16 renamed Middleware to Proxy. Session refresh lives in
`proxy.ts` at the project root, not `middleware.ts`.

## Setup

1. Create a **new, isolated** Supabase project (do not reuse the Makers Arcane
   or Farmers Arcane projects).
2. Run `db/001_schema.sql` in the Supabase SQL editor. Apply to dev first,
   verify, then prod.
3. Copy `.env.local.example` to `.env.local` and fill it in.
4. `npm install && npm run dev`

### Google Books API key

`GOOGLE_BOOKS_API_KEY` is effectively **required**. Without a key, requests use
a shared anonymous Google project whose daily quota is routinely exhausted, and
lookups return HTTP 429. Get a key from the Google Cloud console with the Books
API enabled. It is read server-side only, in `app/api/lookup/route.ts`.

## Data model

One row per book: bibliographic metadata and ownership live together in
`book`. Owning two physical copies of a title means two rows sharing an ISBN;
duplicate detection warns at add time but never blocks. Ratings and reviews
belong to the book row.

`shelf` and `tag` are separate many-to-many concepts: a shelf is *where a book
lives* (genre/topic), a tag is an ad hoc label ("signed copy", "gift from
Mom"). `series` groups books with a `series_position`. `loan` records who has
what, with a partial unique index allowing only one open loan per book and a
generated `status` column derived from `date_returned` so it cannot drift.

Every table is protected by row-level security scoped to `auth.uid()`, and
every server action re-checks the session because actions are reachable by
direct POST.

## Built so far

Phases 1-6 of the build plan:

1. Foundation - scaffold, auth, schema, brand system
2. Core cataloging - add form, ISBN lookup, library grid, detail page
3. Scanning - camera barcode scanning, batch scan mode
4. Organization - shelves with cover previews, tags, wishlist and
   "move to shelves", duplicate detection
5. Engagement - reviews and ratings, three-state read status with dates,
   series tracking
6. Records - purchase/value info, loan tracking with badges

Search and filtering shipped early, since the grid is unusable without it.

## Not yet built

- CSV import with column mapping and Goodreads auto-detect (phase 7)
- Reading stats dashboard (phase 8)
- Seeded public demo dataset, case-study page, subdomain wiring (phase 9)

The `profile.is_demo` column exists for the demo account, but no anonymous read
policies have been written yet - those land with the demo dataset.

## v2 backlog

Dark mode, self-hosted covers in Supabase Storage, PWA/offline scanning,
printable inventory, scheduled backup exports, share cards, LibraryThing and
StoryGraph import, half-star ratings.
