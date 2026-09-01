import { toIsbnPair, normalizeIsbn, isValidIsbn } from './isbn'
import type { BookFormat } from './types'

// Server-only. The API key must never reach the browser, so every lookup goes
// through /api/lookup rather than being called from a client component.

const API = 'https://www.googleapis.com/books/v1/volumes'

export type VolumeCandidate = {
  google_books_id: string | null
  isbn10: string | null
  isbn13: string | null
  title: string
  subtitle: string | null
  authors: string[]
  categories: string[]
  publisher: string | null
  page_count: number | null
  description: string | null
  cover_image_url: string | null
  language: string | null
  published_date: string | null
  /** Google Books does not reliably report binding, so format and edition are
   *  always left for the user to set even after an autofill. */
  format: BookFormat | null
  edition: string | null
}

type GoogleVolume = {
  id?: string
  volumeInfo?: {
    title?: string
    subtitle?: string
    authors?: string[]
    categories?: string[]
    publisher?: string
    pageCount?: number
    description?: string
    language?: string
    publishedDate?: string
    industryIdentifiers?: { type?: string; identifier?: string }[]
    imageLinks?: Record<string, string>
  }
}

/** Google serves covers over http and at a zoom level that looks soft on
 *  retina displays. Upgrade both. */
function bestCover(images: Record<string, string> | undefined): string | null {
  if (!images) return null
  const url =
    images.extraLarge ??
    images.large ??
    images.medium ??
    images.thumbnail ??
    images.smallThumbnail
  if (!url) return null
  return url.replace(/^http:/, 'https:').replace(/&edge=curl/, '')
}

function mapVolume(volume: GoogleVolume): VolumeCandidate {
  const info = volume.volumeInfo ?? {}
  const ids = info.industryIdentifiers ?? []

  const rawIsbn13 = ids.find((i) => i.type === 'ISBN_13')?.identifier ?? null
  const rawIsbn10 = ids.find((i) => i.type === 'ISBN_10')?.identifier ?? null

  // Derive the missing form rather than trusting Google to return both.
  const pair = toIsbnPair(rawIsbn13 ?? rawIsbn10 ?? '')

  return {
    google_books_id: volume.id ?? null,
    isbn13: rawIsbn13 ? normalizeIsbn(rawIsbn13) : pair.isbn13,
    isbn10: rawIsbn10 ? normalizeIsbn(rawIsbn10) : pair.isbn10,
    title: info.title ?? 'Untitled',
    subtitle: info.subtitle ?? null,
    authors: info.authors ?? [],
    categories: info.categories ?? [],
    publisher: info.publisher ?? null,
    page_count: typeof info.pageCount === 'number' ? info.pageCount : null,
    description: info.description ?? null,
    cover_image_url: bestCover(info.imageLinks),
    language: info.language ?? null,
    published_date: info.publishedDate ?? null,
    format: null,
    edition: null,
  }
}

async function query(params: Record<string, string>): Promise<GoogleVolume[]> {
  const url = new URL(API)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set('key', process.env.GOOGLE_BOOKS_API_KEY)
  }

  const res = await fetch(url, {
    // Editions change rarely; a day of caching keeps repeat scans of the same
    // stack from burning quota.
    next: { revalidate: 86400 },
  })

  if (!res.ok) {
    throw new Error(`Google Books returned ${res.status}`)
  }

  const json = (await res.json()) as { items?: GoogleVolume[] }
  return json.items ?? []
}

/**
 * Look a volume up by ISBN. Tries both ISBN forms, because Google indexes some
 * editions only under one of them. Returns every candidate: reprints and
 * regional editions legitimately produce more than one, and the spec calls for
 * letting the user pick rather than guessing.
 */
export async function lookupByIsbn(raw: string): Promise<VolumeCandidate[]> {
  const isbn = normalizeIsbn(raw)
  if (!isValidIsbn(isbn)) return []

  const { isbn10, isbn13 } = toIsbnPair(isbn)
  const forms = [isbn13, isbn10].filter((v): v is string => Boolean(v))

  const seen = new Set<string>()
  const candidates: VolumeCandidate[] = []

  for (const form of forms) {
    const items = await query({ q: `isbn:${form}`, maxResults: '10' })
    for (const item of items) {
      const mapped = mapVolume(item)
      const key = mapped.google_books_id ?? `${mapped.title}|${mapped.authors.join()}`
      if (seen.has(key)) continue
      seen.add(key)
      candidates.push(mapped)
    }
    // The 13-digit form is authoritative when it returns anything.
    if (candidates.length > 0) break
  }

  return candidates
}

/** Free-text fallback for books with no barcode or an unindexed ISBN. */
export async function searchVolumes(text: string): Promise<VolumeCandidate[]> {
  const trimmed = text.trim()
  if (trimmed.length < 2) return []
  const items = await query({ q: trimmed, maxResults: '20' })
  return items.map(mapVolume)
}
