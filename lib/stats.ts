import type { BookWithRelations, ReadStatus } from './types'

// Reading statistics. Pure aggregation over already-fetched books, with no
// database access of its own, so the numbers can be unit tested directly and
// the page stays a thin rendering layer.

export type YearStat = {
  year: number
  booksRead: number
  pagesRead: number
}

export type CountStat = {
  name: string
  count: number
}

export type ReadingStats = {
  /** Owned books only; wishlist entries are aspirations, not holdings. */
  totalOwned: number
  totalWishlist: number
  byStatus: Record<ReadStatus, number>
  /** Descending by year, only years with a finished book. */
  perYear: YearStat[]
  currentlyReading: BookWithRelations[]
  topAuthors: CountStat[]
  topCategories: CountStat[]
  /** Null when nothing has been rated. */
  averageRating: number | null
  ratedCount: number
  /** Owned books whose page_count is known. */
  totalPagesOwned: number
  booksOnLoan: number
}

/**
 * Read a calendar year from a date column without going through Date.
 *
 * `date_finished` is a Postgres `date`, serialized as "YYYY-MM-DD" with no
 * timezone. Passing that to `new Date()` parses it as UTC midnight, which in
 * any negative-offset timezone renders as December 31st of the prior year --
 * silently misfiling every January 1st finish into the previous year's count.
 */
export function yearOf(isoDate: string | null): number | null {
  if (!isoDate) return null
  const match = /^(\d{4})-\d{2}-\d{2}/.exec(isoDate)
  return match ? Number(match[1]) : null
}

function tally(values: string[], limit: number): CountStat[] {
  const counts = new Map<string, number>()
  for (const value of values) {
    const name = value.trim()
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    // Ties broken alphabetically so the order is stable between renders
    // rather than depending on insertion order.
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}

export function computeStats(
  books: BookWithRelations[],
  options: { topN?: number } = {}
): ReadingStats {
  const topN = options.topN ?? 8

  const owned = books.filter((b) => b.location === 'shelf')
  const wishlist = books.filter((b) => b.location === 'wishlist')

  const byStatus: Record<ReadStatus, number> = { unread: 0, reading: 0, read: 0 }
  for (const book of owned) byStatus[book.read_status]++

  // Per-year totals count a book in the year it was finished. Books marked
  // read with no finish date cannot be placed, so they are counted in
  // byStatus.read but contribute to no year -- the two figures legitimately
  // disagree, and the page says so rather than hiding it.
  const years = new Map<number, YearStat>()
  for (const book of books) {
    if (book.read_status !== 'read') continue
    const year = yearOf(book.date_finished)
    if (year === null) continue
    const entry = years.get(year) ?? { year, booksRead: 0, pagesRead: 0 }
    entry.booksRead++
    entry.pagesRead += book.page_count ?? 0
    years.set(year, entry)
  }

  const rated = books.filter((b) => b.rating !== null)
  const averageRating =
    rated.length === 0
      ? null
      : Math.round((rated.reduce((sum, b) => sum + (b.rating ?? 0), 0) / rated.length) * 10) / 10

  return {
    totalOwned: owned.length,
    totalWishlist: wishlist.length,
    byStatus,
    perYear: [...years.values()].sort((a, b) => b.year - a.year),
    currentlyReading: books
      .filter((b) => b.read_status === 'reading')
      .sort((a, b) => (b.date_started ?? '').localeCompare(a.date_started ?? '')),
    topAuthors: tally(owned.flatMap((b) => b.authors), topN),
    topCategories: tally(owned.flatMap((b) => b.categories), topN),
    averageRating,
    ratedCount: rated.length,
    totalPagesOwned: owned.reduce((sum, b) => sum + (b.page_count ?? 0), 0),
    booksOnLoan: owned.filter((b) => b.active_loan !== null).length,
  }
}

/** Books marked read that carry no finish date, so no year can claim them. */
export function unplaceableReadCount(books: BookWithRelations[]): number {
  return books.filter(
    (b) => b.read_status === 'read' && yearOf(b.date_finished) === null
  ).length
}
