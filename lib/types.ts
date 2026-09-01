export type BookLocation = 'shelf' | 'wishlist'
export type ReadStatus = 'unread' | 'reading' | 'read'
export type LoanStatus = 'out' | 'returned'

export const BOOK_FORMATS = [
  'hardcover',
  'paperback',
  'mass_market',
  'board_book',
  'audiobook',
  'ebook',
  'other',
] as const
export type BookFormat = (typeof BOOK_FORMATS)[number]

export const FORMAT_LABELS: Record<BookFormat, string> = {
  hardcover: 'Hardcover',
  paperback: 'Paperback',
  mass_market: 'Mass market',
  board_book: 'Board book',
  audiobook: 'Audiobook',
  ebook: 'Ebook',
  other: 'Other',
}

export const READ_STATUS_LABELS: Record<ReadStatus, string> = {
  unread: 'Unread',
  reading: 'Reading',
  read: 'Read',
}

export const CONDITIONS = [
  'new',
  'like_new',
  'very_good',
  'good',
  'fair',
  'poor',
] as const
export type Condition = (typeof CONDITIONS)[number]

export const CONDITION_LABELS: Record<Condition, string> = {
  new: 'New',
  like_new: 'Like new',
  very_good: 'Very good',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

export type Book = {
  id: string
  user_id: string
  isbn10: string | null
  isbn13: string | null
  title: string
  subtitle: string | null
  authors: string[]
  categories: string[]
  publisher: string | null
  page_count: number | null
  edition: string | null
  format: BookFormat | null
  description: string | null
  cover_image_url: string | null
  google_books_id: string | null
  language: string | null
  published_date: string | null
  location: BookLocation
  condition: Condition | null
  read_status: ReadStatus
  date_started: string | null
  date_finished: string | null
  rating: number | null
  review_text: string | null
  date_reviewed: string | null
  series_id: string | null
  series_position: number | null
  price_paid: number | null
  purchase_date: string | null
  purchased_from: string | null
  gift_from: string | null
  estimated_value: number | null
  notes: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type Shelf = {
  id: string
  user_id: string
  name: string
  sort_order: number
  created_at: string
}

export type Tag = {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type Series = {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type Loan = {
  id: string
  book_id: string
  borrower_name: string
  date_loaned: string
  due_date: string | null
  date_returned: string | null
  status: LoanStatus
  notes: string | null
  created_at: string
}

/** A book row joined with its shelves, tags, series, and active loan. */
export type BookWithRelations = Book & {
  shelves: Shelf[]
  tags: Tag[]
  series: Series | null
  active_loan: Loan | null
}

/** Alt text default required by the accessibility spec. */
export function coverAlt(book: Pick<Book, 'title' | 'authors'>): string {
  const author = book.authors?.[0]
  return author ? `${book.title} by ${author}` : book.title
}

export function displayAuthors(authors: string[] | null | undefined): string {
  if (!authors || authors.length === 0) return 'Unknown author'
  if (authors.length <= 2) return authors.join(' and ')
  return `${authors[0]} and ${authors.length - 1} others`
}
