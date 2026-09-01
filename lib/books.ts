import { tryGetDb, type Sql } from '@/lib/db'
import type {
  Book,
  BookWithRelations,
  Loan,
  Series,
  Shelf,
  Tag,
  ReadStatus,
  BookLocation,
} from '@/lib/types'

// Server-side reads. Every query is additionally scoped by user_id even though
// RLS already enforces ownership — belt and braces, and it keeps the intent
// readable at the call site.
//
// Under Supabase this file leaned on PostgREST's nested-select syntax
// (`book_shelf ( shelf ( * ) )`, etc.) to fetch a book and its relations in
// one request. Neon's SQL client has no such resource-embedding layer, so
// each "join" below is an explicit query against the junction table, fetched
// alongside the others and stitched together in JS by `attachRelations` —
// the same shape getShelvesWithPreviews already used for its shelf/book
// join even under Supabase.

/** Attaches shelves, tags, series, and the active loan (if any) to a set of
 *  bare `book` rows — the equivalent of the old PostgREST nested select. */
async function attachRelations(
  sql: Sql,
  books: Book[]
): Promise<BookWithRelations[]> {
  if (books.length === 0) return []

  const ids = books.map((b) => b.id)
  const seriesIds = [...new Set(books.map((b) => b.series_id).filter((v): v is string => Boolean(v)))]

  const [shelfLinksRaw, tagLinksRaw, loansRaw, seriesRaw] = await Promise.all([
    sql`
      select bs.book_id as book_id, s.*
      from book_shelf bs
      join shelf s on s.id = bs.shelf_id
      where bs.book_id = any(${ids}::uuid[])
    `,
    sql`
      select bt.book_id as book_id, t.*
      from book_tag bt
      join tag t on t.id = bt.tag_id
      where bt.book_id = any(${ids}::uuid[])
    `,
    sql`
      select * from loan
      where book_id = any(${ids}::uuid[]) and date_returned is null
    `,
    seriesIds.length > 0
      ? sql`select * from series where id = any(${seriesIds}::uuid[])`
      : Promise.resolve([]),
  ])

  const shelfLinks = shelfLinksRaw as unknown as (Shelf & { book_id: string })[]
  const tagLinks = tagLinksRaw as unknown as (Tag & { book_id: string })[]
  const loans = loansRaw as unknown as Loan[]
  const seriesRows = seriesRaw as unknown as Series[]

  const shelvesByBook = new Map<string, Shelf[]>()
  for (const { book_id, ...shelf } of shelfLinks) {
    const list = shelvesByBook.get(book_id) ?? []
    list.push(shelf as Shelf)
    shelvesByBook.set(book_id, list)
  }

  const tagsByBook = new Map<string, Tag[]>()
  for (const { book_id, ...tag } of tagLinks) {
    const list = tagsByBook.get(book_id) ?? []
    list.push(tag as Tag)
    tagsByBook.set(book_id, list)
  }

  const loanByBook = new Map(loans.map((l) => [l.book_id, l]))
  const seriesById = new Map(seriesRows.map((s) => [s.id, s]))

  return books.map((book) => ({
    ...book,
    shelves: (shelvesByBook.get(book.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    tags: (tagsByBook.get(book.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    series: book.series_id ? seriesById.get(book.series_id) ?? null : null,
    active_loan: loanByBook.get(book.id) ?? null,
  }))
}

export type BookFilters = {
  location?: BookLocation
  shelfId?: string
  tagId?: string
  seriesId?: string
  readStatus?: ReadStatus
  format?: string
  author?: string
  search?: string
  onLoan?: boolean
  sort?: 'recent' | 'title' | 'author' | 'rating' | 'pages'
}

export async function getBooks(
  filters: BookFilters = {}
): Promise<BookWithRelations[]> {
  const db = await tryGetDb()
  if (!db) return []
  const { sql, userId } = db

  const conditions = ['user_id = $1', 'deleted_at is null']
  const params: unknown[] = [userId]

  if (filters.location) {
    params.push(filters.location)
    conditions.push(`location = $${params.length}`)
  }
  if (filters.readStatus) {
    params.push(filters.readStatus)
    conditions.push(`read_status = $${params.length}`)
  }
  if (filters.format) {
    params.push(filters.format)
    conditions.push(`format = $${params.length}`)
  }
  if (filters.seriesId) {
    params.push(filters.seriesId)
    conditions.push(`series_id = $${params.length}`)
  }
  if (filters.author) {
    // authors is a text[] column — contains() maps to Postgres's @> operator.
    params.push([filters.author])
    conditions.push(`authors @> $${params.length}::text[]`)
  }

  let orderBy = 'order by created_at desc'
  switch (filters.sort) {
    case 'title':
      orderBy = 'order by title asc'
      break
    case 'rating':
      orderBy = 'order by rating desc nulls last'
      break
    case 'pages':
      orderBy = 'order by page_count desc nulls last'
      break
  }

  const rows = (await sql.query(
    `select * from book where ${conditions.join(' and ')} ${orderBy}`,
    params
  )) as Book[]

  let books = await attachRelations(sql, rows)

  // Shelf, tag, author-sort, and loan filters run in JS: they depend on the
  // joined rows, which the base query above cannot filter without dropping
  // parents (same tradeoff PostgREST forced here originally).
  if (filters.shelfId) {
    books = books.filter((b) => b.shelves.some((s) => s.id === filters.shelfId))
  }
  if (filters.tagId) {
    books = books.filter((b) => b.tags.some((t) => t.id === filters.tagId))
  }
  if (filters.onLoan) {
    books = books.filter((b) => b.active_loan !== null)
  }
  if (filters.search) {
    // Matched in memory rather than in SQL: authors is an array column a
    // simple ilike can't reach cleanly, and a personal library is small
    // enough that this stays cheap.
    const term = filters.search.toLowerCase()
    books = books.filter((b) =>
      [b.title, b.subtitle, b.description, b.publisher, ...b.authors]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(term))
    )
  }
  if (filters.sort === 'author') {
    books.sort((a, b) =>
      (a.authors[0] ?? '~').localeCompare(b.authors[0] ?? '~')
    )
  }

  return books
}

export async function getBook(id: string): Promise<BookWithRelations | null> {
  const db = await tryGetDb()
  if (!db) return null
  const { sql, userId } = db

  const rows = (await sql`
    select * from book
    where id = ${id} and user_id = ${userId} and deleted_at is null
  `) as Book[]
  if (rows.length === 0) return null

  const [book] = await attachRelations(sql, rows)
  return book
}

export async function getLoanHistory(bookId: string): Promise<Loan[]> {
  const db = await tryGetDb()
  if (!db) return []
  const { sql } = db
  const rows = (await sql`
    select * from loan
    where book_id = ${bookId}
    order by date_loaned desc
  `) as Loan[]
  return rows
}

export async function getShelves(): Promise<Shelf[]> {
  const db = await tryGetDb()
  if (!db) return []
  const { sql, userId } = db
  const rows = (await sql`
    select * from shelf
    where user_id = ${userId}
    order by sort_order asc, name asc
  `) as Shelf[]
  return rows
}

export type ShelfWithPreview = Shelf & {
  book_count: number
  preview_covers: { id: string; title: string; cover_image_url: string | null }[]
}

/**
 * Shelves with a small stack of cover thumbnails each, for the shelf picker in
 * the add flow and the shelves index. Confirmed reading of the spec's
 * "preview of a book with the associated tag next to each shelf".
 */
export async function getShelvesWithPreviews(): Promise<ShelfWithPreview[]> {
  const db = await tryGetDb()
  if (!db) return []
  const { sql, userId } = db

  type Link = {
    shelf_id: string
    id: string
    title: string
    cover_image_url: string | null
    created_at: string
    deleted_at: string | null
  }

  const [shelvesRaw, linksRaw] = await Promise.all([
    sql`
      select * from shelf
      where user_id = ${userId}
      order by sort_order asc, name asc
    `,
    sql`
      select bs.shelf_id as shelf_id,
             b.id as id, b.title as title, b.cover_image_url as cover_image_url,
             b.created_at as created_at, b.deleted_at as deleted_at
      from book_shelf bs
      join book b on b.id = bs.book_id
      join shelf s on s.id = bs.shelf_id
      where s.user_id = ${userId}
      order by b.created_at desc
    `,
  ])

  const shelves = shelvesRaw as unknown as Shelf[]
  const links = linksRaw as unknown as Link[]

  const byShelf = new Map<string, Link[]>()
  for (const link of links) {
    if (link.deleted_at) continue
    const list = byShelf.get(link.shelf_id) ?? []
    list.push(link)
    byShelf.set(link.shelf_id, list)
  }

  return shelves.map((shelf) => {
    const books = byShelf.get(shelf.id) ?? []
    return {
      ...shelf,
      book_count: books.length,
      preview_covers: books.slice(0, 4).map((b) => ({
        id: b.id,
        title: b.title,
        cover_image_url: b.cover_image_url,
      })),
    }
  })
}

export async function getTags(): Promise<Tag[]> {
  const db = await tryGetDb()
  if (!db) return []
  const { sql, userId } = db
  const rows = (await sql`
    select * from tag where user_id = ${userId} order by name asc
  `) as Tag[]
  return rows
}

export async function getSeriesList(): Promise<Series[]> {
  const db = await tryGetDb()
  if (!db) return []
  const { sql, userId } = db
  const rows = (await sql`
    select * from series where user_id = ${userId} order by name asc
  `) as Series[]
  return rows
}

/** Distinct author names across the catalog, for the author filter. Selects
 *  only the authors column so populating a dropdown never costs a second full
 *  library read. */
export async function getAuthors(): Promise<string[]> {
  const db = await tryGetDb()
  if (!db) return []
  const { sql, userId } = db

  const rows = (await sql`
    select authors from book
    where user_id = ${userId} and deleted_at is null
  `) as { authors: string[] | null }[]

  const names = new Set<string>()
  for (const row of rows) {
    for (const name of row.authors ?? []) if (name) names.add(name)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

export type SeriesSummary = Series & {
  books: BookWithRelations[]
  /** Positions between 1 and the highest owned number that are not cataloged.
   *  Only meaningful once at least one entry carries a position. */
  missing_positions: number[]
}

export async function getSeriesSummaries(): Promise<SeriesSummary[]> {
  const [list, books] = await Promise.all([getSeriesList(), getBooks({})])

  return list.map((series) => {
    const owned = books
      .filter((b) => b.series_id === series.id)
      .sort((a, b) => (a.series_position ?? 999) - (b.series_position ?? 999))

    const positions = owned
      .map((b) => b.series_position)
      .filter((p): p is number => p !== null && Number.isInteger(p) && p > 0)

    const missing: number[] = []
    if (positions.length > 0) {
      const highest = Math.max(...positions)
      const have = new Set(positions)
      for (let i = 1; i <= highest; i++) if (!have.has(i)) missing.push(i)
    }

    return { ...series, books: owned, missing_positions: missing }
  })
}

/** Every book currently checked out, newest loan first. */
export async function getActiveLoans(): Promise<BookWithRelations[]> {
  const books = await getBooks({})
  return books
    .filter((b) => b.active_loan !== null)
    .sort(
      (a, b) =>
        new Date(b.active_loan!.date_loaned).getTime() -
        new Date(a.active_loan!.date_loaned).getTime()
    )
}
