import Papa from 'papaparse'
import { normalizeIsbn, isValidIsbn } from './isbn'
import type { BookInput } from '@/app/actions/books'
import type { BookFormat, BookLocation, ReadStatus } from './types'

// CSV import: parsing, column mapping, and row normalization.
//
// Deliberately free of any database or auth dependency so it can be unit
// tested in isolation and reused by both the preview step and the commit step.
// Nothing here writes; callers hand the resulting BookInput values to
// createBook.

/** Fields an imported column can be mapped onto. */
export const FIELD_KEYS = [
  'title',
  'subtitle',
  'authors',
  'isbn',
  'publisher',
  'published_date',
  'page_count',
  'format',
  'categories',
  'description',
  'rating',
  'review_text',
  'read_status',
  'date_started',
  'date_finished',
  'shelves',
  'tags',
  'series_name',
  'series_position',
  'price_paid',
  'purchase_date',
  'purchased_from',
  'notes',
] as const

export type FieldKey = (typeof FIELD_KEYS)[number]

export const FIELD_LABELS: Record<FieldKey, string> = {
  title: 'Title',
  subtitle: 'Subtitle',
  authors: 'Author(s)',
  isbn: 'ISBN',
  publisher: 'Publisher',
  published_date: 'Published',
  page_count: 'Pages',
  format: 'Format',
  categories: 'Categories',
  description: 'Description',
  rating: 'Rating',
  review_text: 'Review',
  read_status: 'Read status',
  date_started: 'Date started',
  date_finished: 'Date finished',
  shelves: 'Shelves',
  tags: 'Tags',
  series_name: 'Series',
  series_position: 'Series number',
  price_paid: 'Price paid',
  purchase_date: 'Purchase date',
  purchased_from: 'Purchased from',
  notes: 'Notes',
}

/** Only a title is strictly required to create a book. */
export const REQUIRED_FIELDS: FieldKey[] = ['title']

export type ColumnMapping = Partial<Record<FieldKey, string>>

export type CsvSource = 'goodreads' | 'generic'

export type ParsedCsv = {
  headers: string[]
  rows: Record<string, string>[]
  /** Papaparse's own row-level complaints, e.g. ragged columns. */
  parseErrors: string[]
}

/**
 * Parse raw CSV text. Values are kept as strings; type coercion happens during
 * mapping so the preview can show exactly what was in the file.
 */
export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    // Goodreads pads some headers with stray whitespace.
    transformHeader: (h) => h.trim(),
  })

  return {
    headers: (result.meta.fields ?? []).filter(Boolean),
    rows: result.data ?? [],
    parseErrors: (result.errors ?? []).map(
      (e) => `Row ${typeof e.row === 'number' ? e.row + 2 : '?'}: ${e.message}`
    ),
  }
}

// Goodreads exports a stable, documented column set. Detecting it lets the
// mapping step start fully populated instead of making the user match 20
// columns by hand.
const GOODREADS_SIGNATURE = ['Book Id', 'Exclusive Shelf', 'My Rating']

export function detectSource(headers: string[]): CsvSource {
  const present = new Set(headers)
  const hits = GOODREADS_SIGNATURE.filter((h) => present.has(h)).length
  return hits >= 2 ? 'goodreads' : 'generic'
}

const GOODREADS_MAPPING: ColumnMapping = {
  title: 'Title',
  authors: 'Author',
  isbn: 'ISBN13',
  publisher: 'Publisher',
  published_date: 'Year Published',
  page_count: 'Number of Pages',
  format: 'Binding',
  rating: 'My Rating',
  review_text: 'My Review',
  read_status: 'Exclusive Shelf',
  date_finished: 'Date Read',
  shelves: 'Bookshelves',
  notes: 'Private Notes',
}

/** Header aliases for non-Goodreads files, matched case/spacing-insensitively. */
const GENERIC_ALIASES: Record<FieldKey, string[]> = {
  title: ['title', 'book', 'bookname', 'booktitle', 'name'],
  subtitle: ['subtitle'],
  authors: ['author', 'authors', 'by', 'writer'],
  isbn: ['isbn', 'isbn13', 'isbn10', 'isbn_13', 'barcode'],
  publisher: ['publisher', 'imprint'],
  published_date: ['published', 'publishdate', 'publisheddate', 'yearpublished', 'year', 'pubdate'],
  page_count: ['pages', 'pagecount', 'numberofpages', 'length'],
  format: ['format', 'binding', 'edition type', 'mediatype'],
  categories: ['categories', 'category', 'genre', 'genres', 'subject'],
  description: ['description', 'summary', 'synopsis', 'blurb'],
  rating: ['rating', 'myrating', 'starrating', 'stars', 'score', 'personalrating'],
  review_text: ['review', 'myreview', 'comments', 'notes to self'],
  read_status: ['status', 'readstatus', 'exclusiveshelf', 'shelf', 'readingstatus'],
  date_started: ['datestarted', 'started', 'startdate', 'dateadded'],
  date_finished: ['dateread', 'datefinished', 'finished', 'finishdate', 'readdate', 'datecompleted', 'completedon'],
  shelves: ['shelves', 'bookshelves', 'collection', 'collections', 'location'],
  tags: ['tags', 'tag', 'labels', 'keywords'],
  series_name: ['series', 'seriesname'],
  series_position: ['seriesposition', 'seriesnumber', 'booknumber', 'volume', 'seriesindex'],
  price_paid: ['price', 'pricepaid', 'cost', 'purchaseprice', 'amountpaid', 'paid'],
  purchase_date: ['purchasedate', 'datepurchased', 'bought', 'dateacquired'],
  purchased_from: ['purchasedfrom', 'boughtfrom', 'boughtat', 'purchasedat', 'source', 'vendor', 'store', 'retailer', 'seller'],
  notes: ['notes', 'note', 'privatenotes', 'remarks'],
}

const canon = (s: string) => s.toLowerCase().replace(/[\s_\-.]/g, '')

/**
 * Best-guess mapping of CSV headers onto fields. Goodreads files get their
 * documented layout; everything else is matched by alias. Always a starting
 * point for the user to correct, never the final word.
 */
export function suggestMapping(headers: string[]): ColumnMapping {
  const present = new Set(headers)

  if (detectSource(headers) === 'goodreads') {
    const mapping: ColumnMapping = {}
    for (const [field, header] of Object.entries(GOODREADS_MAPPING)) {
      if (present.has(header)) mapping[field as FieldKey] = header
    }
    // Goodreads splits the ISBN across two columns and leaves ISBN13 empty for
    // older titles, so fall back rather than importing them with no ISBN.
    if (!mapping.isbn && present.has('ISBN')) mapping.isbn = 'ISBN'
    return mapping
  }

  const mapping: ColumnMapping = {}
  const taken = new Set<string>()
  for (const field of FIELD_KEYS) {
    const aliases = GENERIC_ALIASES[field].map(canon)
    const match = headers.find(
      (h) => !taken.has(h) && aliases.includes(canon(h))
    )
    if (match) {
      mapping[field] = match
      taken.add(match)
    }
  }
  return mapping
}

// ---------------------------------------------------------------- coercion

/**
 * Goodreads wraps ISBNs as ="0765326353" so spreadsheet apps don't mangle them
 * into scientific notation. An empty cell exports as ="".
 */
export function stripSpreadsheetGuard(value: string): string {
  const trimmed = value.trim()
  const match = /^="(.*)"$/.exec(trimmed)
  return match ? match[1].trim() : trimmed
}

const FORMAT_ALIASES: Record<string, BookFormat> = {
  hardcover: 'hardcover',
  hardback: 'hardcover',
  cloth: 'hardcover',
  paperback: 'paperback',
  softcover: 'paperback',
  tradepaperback: 'paperback',
  massmarketpaperback: 'mass_market',
  massmarket: 'mass_market',
  boardbook: 'board_book',
  kindleedition: 'ebook',
  kindle: 'ebook',
  ebook: 'ebook',
  epub: 'ebook',
  audiobook: 'audiobook',
  audiocd: 'audiobook',
  audibleaudio: 'audiobook',
  audio: 'audiobook',
}

export function normalizeFormat(value: string): BookFormat | null {
  const key = canon(value)
  if (!key) return null
  return FORMAT_ALIASES[key] ?? 'other'
}

const STATUS_ALIASES: Record<string, ReadStatus> = {
  read: 'read',
  finished: 'read',
  complete: 'read',
  completed: 'read',
  currentlyreading: 'reading',
  reading: 'reading',
  inprogress: 'reading',
  toread: 'unread',
  unread: 'unread',
  wanttoread: 'unread',
  none: 'unread',
}

export function normalizeReadStatus(value: string): ReadStatus | null {
  const key = canon(value)
  if (!key) return null
  return STATUS_ALIASES[key] ?? null
}

/**
 * Normalize a date to YYYY-MM-DD. Handles the ISO form, Goodreads' YYYY/MM/DD,
 * and US-style MM/DD/YYYY.
 *
 * A bare year is intentionally rejected: "2019" is a real value in Goodreads'
 * Year Published column, but it is not a date, and coercing it to 2019-01-01
 * would invent a precision the source never had. published_date is a text
 * column precisely so bare years survive; true date columns stay null.
 */
export function normalizeDate(value: string): string | null {
  const v = stripSpreadsheetGuard(value)
  if (!v) return null

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v)
  if (iso) return pad(iso[1], iso[2], iso[3])

  const slashed = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(v)
  if (slashed) return pad(slashed[1], slashed[2], slashed[3])

  // Ambiguous by nature; US ordering is assumed since that is where the
  // owner's data comes from. Documented rather than silently guessed.
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v)
  if (us) return pad(us[3], us[1], us[2])

  return null
}

function pad(y: string, m: string, d: string): string | null {
  const month = Number(m)
  const day = Number(d)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function toNumber(value: string): number | null {
  const cleaned = stripSpreadsheetGuard(value).replace(/[$,]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Split a delimited cell (shelves, tags, authors, categories). */
function splitList(value: string): string[] {
  return stripSpreadsheetGuard(value)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// ------------------------------------------------------------- row mapping

export type ImportOptions = {
  source: CsvSource
  /** Where imported books land. Goodreads' "to-read" rows override this. */
  defaultLocation: BookLocation
  /** Shelves applied to every imported row, on top of any from the file. */
  defaultShelfNames?: string[]
}

export type MappedRow = {
  /** 1-based row number as it appears in the file, counting the header. */
  lineNumber: number
  input: BookInput | null
  /** Why the row cannot be imported. Non-empty means it will be skipped. */
  errors: string[]
  /** Imported, but something was dropped or assumed. */
  warnings: string[]
}

// Goodreads repeats the exclusive shelf inside Bookshelves. Importing those as
// real shelves would litter the library with "to-read" and "currently-reading"
// alongside the user's actual shelf names.
const GOODREADS_STATUS_SHELVES = new Set([
  'to-read',
  'currently-reading',
  'read',
])

export function mapRow(
  row: Record<string, string>,
  mapping: ColumnMapping,
  options: ImportOptions,
  lineNumber: number
): MappedRow {
  const errors: string[] = []
  const warnings: string[] = []

  const get = (field: FieldKey): string => {
    const header = mapping[field]
    if (!header) return ''
    return stripSpreadsheetGuard(row[header] ?? '')
  }

  const title = get('title')
  if (!title) {
    return {
      lineNumber,
      input: null,
      errors: ['No title, so there is nothing to catalog.'],
      warnings,
    }
  }

  // Authors: Goodreads splits primary and additional across two columns.
  const authors = splitList(get('authors'))
  if (options.source === 'goodreads') {
    authors.push(...splitList(stripSpreadsheetGuard(row['Additional Authors'] ?? '')))
  }

  // ISBN: keep it only if it actually validates. A malformed ISBN stored as-is
  // would poison duplicate detection later, which matches on exact values.
  const rawIsbn = get('isbn')
  let isbn: string | null = null
  if (rawIsbn) {
    const normalized = normalizeIsbn(rawIsbn)
    if (isValidIsbn(normalized)) {
      isbn = normalized
    } else {
      warnings.push(`Ignored an ISBN that failed its check digit ("${rawIsbn}").`)
    }
  }

  // Rating: Goodreads writes 0 for "not rated", which is not a 1-5 value.
  let rating: number | null = null
  const rawRating = get('rating')
  if (rawRating) {
    const n = toNumber(rawRating)
    if (n === null || n === 0) {
      rating = null
    } else if (n >= 1 && n <= 5) {
      rating = Math.round(n)
    } else {
      warnings.push(`Ignored an out-of-range rating ("${rawRating}").`)
    }
  }

  const readStatus = normalizeReadStatus(get('read_status'))
  const rawStatus = get('read_status')
  if (rawStatus && readStatus === null) {
    warnings.push(`Unrecognized status "${rawStatus}", imported as unread.`)
  }

  // Goodreads' "to-read" means a book the user wants, not one they own, so it
  // belongs on the wishlist regardless of the chosen default.
  const wantsIt = canon(rawStatus) === 'toread'
  const location: BookLocation = wantsIt ? 'wishlist' : options.defaultLocation

  let shelfNames = splitList(get('shelves'))
  if (options.source === 'goodreads') {
    shelfNames = shelfNames.filter((s) => !GOODREADS_STATUS_SHELVES.has(s.toLowerCase()))
  }
  shelfNames.push(...(options.defaultShelfNames ?? []))
  // Wishlist entries are not shelved, matching createBook's own behavior.
  if (location === 'wishlist') shelfNames = []

  const dateFinished = normalizeDate(get('date_finished'))
  const rawFinished = get('date_finished')
  if (rawFinished && !dateFinished) {
    warnings.push(`Could not read the finish date "${rawFinished}".`)
  }

  const pageCount = toNumber(get('page_count'))
  const seriesPosition = toNumber(get('series_position'))
  const pricePaid = toNumber(get('price_paid'))

  const input: BookInput = {
    isbn,
    title,
    subtitle: get('subtitle') || null,
    authors,
    categories: splitList(get('categories')),
    publisher: get('publisher') || null,
    page_count: pageCount !== null && pageCount > 0 ? Math.round(pageCount) : null,
    format: get('format') ? normalizeFormat(get('format')) : null,
    description: get('description') || null,
    // Text column, so a bare year like "2019" is preserved as-is.
    published_date: get('published_date') || null,
    location,
    read_status: readStatus ?? 'unread',
    date_started: normalizeDate(get('date_started')),
    date_finished: dateFinished,
    rating,
    review_text: get('review_text') || null,
    series_name: get('series_name') || null,
    series_position: seriesPosition,
    price_paid: pricePaid,
    purchase_date: normalizeDate(get('purchase_date')),
    purchased_from: get('purchased_from') || null,
    notes: get('notes') || null,
    new_shelf_names: [...new Set(shelfNames)],
    new_tag_names: [...new Set(splitList(get('tags')))],
    shelf_ids: [],
    tag_ids: [],
  }

  // A book marked read with no finish date leaves the stats dashboard unable
  // to place it in a year. Worth surfacing, not worth blocking on.
  if (input.read_status === 'read' && !input.date_finished) {
    warnings.push('Marked read but has no finish date.')
  }

  return { lineNumber, input, errors, warnings }
}

export type ImportPreview = {
  rows: MappedRow[]
  /** Rows that will be created. */
  importable: MappedRow[]
  skipped: MappedRow[]
  /** ISBNs appearing more than once in the file itself. */
  duplicateIsbnsInFile: string[]
  summary: {
    total: number
    importable: number
    skipped: number
    withWarnings: number
  }
}

/**
 * Map every row and summarize. Duplicates against the existing library are
 * checked separately at commit time, since that needs the database; this only
 * reports collisions inside the file.
 */
export function buildPreview(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  options: ImportOptions
): ImportPreview {
  const mapped = rows.map((row, i) => mapRow(row, mapping, options, i + 2))

  const importable = mapped.filter((r) => r.errors.length === 0 && r.input)
  const skipped = mapped.filter((r) => r.errors.length > 0 || !r.input)

  const seen = new Map<string, number>()
  for (const r of importable) {
    const isbn = r.input?.isbn
    if (!isbn) continue
    seen.set(isbn, (seen.get(isbn) ?? 0) + 1)
  }
  const duplicateIsbnsInFile = [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([isbn]) => isbn)

  return {
    rows: mapped,
    importable,
    skipped,
    duplicateIsbnsInFile,
    summary: {
      total: mapped.length,
      importable: importable.length,
      skipped: skipped.length,
      withWarnings: mapped.filter((r) => r.warnings.length > 0).length,
    },
  }
}

/** Fields that are mapped but whose column is missing from the file. */
export function validateMapping(
  headers: string[],
  mapping: ColumnMapping
): string[] {
  const problems: string[] = []
  const present = new Set(headers)

  for (const field of REQUIRED_FIELDS) {
    if (!mapping[field]) problems.push(`${FIELD_LABELS[field]} must be mapped to a column.`)
  }
  for (const [field, header] of Object.entries(mapping)) {
    if (header && !present.has(header)) {
      problems.push(`${FIELD_LABELS[field as FieldKey]} is mapped to "${header}", which is not in this file.`)
    }
  }
  return problems
}
