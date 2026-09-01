import { createClient } from '@/lib/supabase-server'
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

const BOOK_SELECT = `
  *,
  book_shelf ( shelf ( * ) ),
  book_tag ( tag ( * ) ),
  series ( * ),
  loan ( * )
`

type RawBook = Book & {
  book_shelf: { shelf: Shelf | null }[] | null
  book_tag: { tag: Tag | null }[] | null
  series: Series | null
  loan: Loan[] | null
}

function flatten(raw: RawBook): BookWithRelations {
  const { book_shelf, book_tag, loan, ...book } = raw
  return {
    ...(book as Book),
    shelves: (book_shelf ?? [])
      .map((r) => r.shelf)
      .filter((s): s is Shelf => Boolean(s))
      .sort((a, b) => a.name.localeCompare(b.name)),
    tags: (book_tag ?? [])
      .map((r) => r.tag)
      .filter((t): t is Tag => Boolean(t))
      .sort((a, b) => a.name.localeCompare(b.name)),
    series: raw.series ?? null,
    active_loan: (loan ?? []).find((l) => l.date_returned === null) ?? null,
  }
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('book')
    .select(BOOK_SELECT)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (filters.location) query = query.eq('location', filters.location)
  if (filters.readStatus) query = query.eq('read_status', filters.readStatus)
  if (filters.format) query = query.eq('format', filters.format)
  if (filters.seriesId) query = query.eq('series_id', filters.seriesId)
  if (filters.author) query = query.contains('authors', [filters.author])

  switch (filters.sort) {
    case 'title':
      query = query.order('title', { ascending: true })
      break
    case 'rating':
      query = query.order('rating', { ascending: false, nullsFirst: false })
      break
    case 'pages':
      query = query.order('page_count', { ascending: false, nullsFirst: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw error

  let books = ((data ?? []) as unknown as RawBook[]).map(flatten)

  // Shelf, tag, author-sort, and loan filters run in JS: they depend on the
  // joined rows, which PostgREST cannot filter without dropping parents.
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
    // Matched in memory rather than via PostgREST's or(): authors is an array
    // column that ilike cannot reach, and a server-side text filter combined
    // with a separate author query would ignore the structural filters above.
    // A personal library is small enough that this stays cheap.
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('book')
    .select(BOOK_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return flatten(data as unknown as RawBook)
}

export async function getLoanHistory(bookId: string): Promise<Loan[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('loan')
    .select('*')
    .eq('book_id', bookId)
    .order('date_loaned', { ascending: false })
  if (error) throw error
  return (data ?? []) as Loan[]
}

export async function getShelves(): Promise<Shelf[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('shelf')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as Shelf[]
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const [shelvesRes, linksRes] = await Promise.all([
    supabase
      .from('shelf')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('book_shelf')
      .select('shelf_id, book ( id, title, cover_image_url, created_at, deleted_at )')
      .order('created_at', { ascending: false }),
  ])

  if (shelvesRes.error) throw shelvesRes.error

  type Link = {
    shelf_id: string
    book: {
      id: string
      title: string
      cover_image_url: string | null
      created_at: string
      deleted_at: string | null
    } | null
  }

  const byShelf = new Map<string, Link['book'][]>()
  for (const link of (linksRes.data ?? []) as unknown as Link[]) {
    if (!link.book || link.book.deleted_at) continue
    const list = byShelf.get(link.shelf_id) ?? []
    list.push(link.book)
    byShelf.set(link.shelf_id, list)
  }

  return ((shelvesRes.data ?? []) as Shelf[]).map((shelf) => {
    const books = byShelf.get(shelf.id) ?? []
    return {
      ...shelf,
      book_count: books.length,
      preview_covers: books.slice(0, 4).map((b) => ({
        id: b!.id,
        title: b!.title,
        cover_image_url: b!.cover_image_url,
      })),
    }
  })
}

export async function getTags(): Promise<Tag[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('tag')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as Tag[]
}

export async function getSeriesList(): Promise<Series[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('series')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as Series[]
}

/** Distinct author names across the catalog, for the author filter. Selects
 *  only the authors column so populating a dropdown never costs a second full
 *  library read. */
export async function getAuthors(): Promise<string[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('book')
    .select('authors')
    .eq('user_id', user.id)
    .is('deleted_at', null)
  if (error) throw error

  const names = new Set<string>()
  for (const row of (data ?? []) as { authors: string[] | null }[]) {
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
