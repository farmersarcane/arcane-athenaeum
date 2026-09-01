'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from './_auth'
import { toIsbnPair } from '@/lib/isbn'
import type { Sql } from '@/lib/db'
import type { BookFormat, BookLocation, Condition, ReadStatus } from '@/lib/types'

export type BookInput = {
  isbn?: string | null
  title: string
  subtitle?: string | null
  authors?: string[]
  categories?: string[]
  publisher?: string | null
  page_count?: number | null
  edition?: string | null
  format?: BookFormat | null
  description?: string | null
  cover_image_url?: string | null
  google_books_id?: string | null
  language?: string | null
  published_date?: string | null
  location?: BookLocation
  condition?: Condition | null
  read_status?: ReadStatus
  date_started?: string | null
  date_finished?: string | null
  rating?: number | null
  review_text?: string | null
  series_name?: string | null
  series_position?: number | null
  price_paid?: number | null
  purchase_date?: string | null
  purchased_from?: string | null
  gift_from?: string | null
  estimated_value?: number | null
  notes?: string | null
  shelf_ids?: string[]
  tag_ids?: string[]
  /** Names typed into the picker that do not exist yet. */
  new_shelf_names?: string[]
  new_tag_names?: string[]
}

function emptyToNull(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null
  const trimmed = v.trim()
  return trimmed === '' ? null : trimmed
}

type NamedTable = 'shelf' | 'tag' | 'series'

/** Find-or-create by name, so the pickers can accept new values inline. */
async function resolveNamed(
  sql: Sql,
  table: NamedTable,
  userId: string,
  names: string[]
): Promise<string[]> {
  const cleaned = [...new Set(names.map((n) => n.trim()).filter(Boolean))]
  if (cleaned.length === 0) return []

  const existing =
    table === 'shelf'
      ? await sql`select id, name from shelf where user_id = ${userId} and name = any(${cleaned}::text[])`
      : table === 'tag'
        ? await sql`select id, name from tag where user_id = ${userId} and name = any(${cleaned}::text[])`
        : await sql`select id, name from series where user_id = ${userId} and name = any(${cleaned}::text[])`

  const found = new Map(
    (existing as { id: string; name: string }[]).map((r) => [r.name, r.id])
  )
  const missing = cleaned.filter((n) => !found.has(n))

  if (missing.length > 0) {
    const inserted =
      table === 'shelf'
        ? await sql`insert into shelf (user_id, name) select ${userId}, unnest(${missing}::text[]) returning id, name`
        : table === 'tag'
          ? await sql`insert into tag (user_id, name) select ${userId}, unnest(${missing}::text[]) returning id, name`
          : await sql`insert into series (user_id, name) select ${userId}, unnest(${missing}::text[]) returning id, name`

    for (const row of inserted as { id: string; name: string }[]) {
      found.set(row.name, row.id)
    }
  }

  return cleaned.map((n) => found.get(n)!).filter(Boolean)
}

async function setLinks(
  sql: Sql,
  table: 'book_shelf' | 'book_tag',
  bookId: string,
  ids: string[]
) {
  const uniq = [...new Set(ids)]
  if (table === 'book_shelf') {
    await sql`delete from book_shelf where book_id = ${bookId}`
    if (uniq.length > 0) {
      await sql`insert into book_shelf (book_id, shelf_id) select ${bookId}, unnest(${uniq}::uuid[])`
    }
  } else {
    await sql`delete from book_tag where book_id = ${bookId}`
    if (uniq.length > 0) {
      await sql`insert into book_tag (book_id, tag_id) select ${bookId}, unnest(${uniq}::uuid[])`
    }
  }
}

function toRow(input: BookInput, userId: string) {
  const { isbn10, isbn13 } = toIsbnPair(input.isbn ?? '')
  return {
    user_id: userId,
    isbn10,
    isbn13,
    title: input.title.trim(),
    subtitle: emptyToNull(input.subtitle),
    authors: (input.authors ?? []).map((a) => a.trim()).filter(Boolean),
    categories: (input.categories ?? []).map((c) => c.trim()).filter(Boolean),
    publisher: emptyToNull(input.publisher),
    page_count: input.page_count ?? null,
    edition: emptyToNull(input.edition),
    format: input.format ?? null,
    description: emptyToNull(input.description),
    cover_image_url: emptyToNull(input.cover_image_url),
    google_books_id: emptyToNull(input.google_books_id),
    language: emptyToNull(input.language),
    published_date: emptyToNull(input.published_date),
    location: input.location ?? 'shelf',
    condition: input.condition ?? null,
    read_status: input.read_status ?? 'unread',
    date_started: emptyToNull(input.date_started),
    date_finished: emptyToNull(input.date_finished),
    rating: input.rating ?? null,
    review_text: emptyToNull(input.review_text),
    // Stamp the review date whenever a rating or review is present, since the
    // stats dashboard and the detail page both surface "reviewed on".
    date_reviewed:
      input.rating || emptyToNull(input.review_text)
        ? new Date().toISOString().slice(0, 10)
        : null,
    series_position: input.series_position ?? null,
    price_paid: input.price_paid ?? null,
    purchase_date: emptyToNull(input.purchase_date),
    purchased_from: emptyToNull(input.purchased_from),
    gift_from: emptyToNull(input.gift_from),
    estimated_value: input.estimated_value ?? null,
    notes: emptyToNull(input.notes),
  }
}

export async function createBook(input: BookInput): Promise<{ id: string }> {
  const { sql, user } = await requireUser()

  if (!input.title?.trim()) throw new Error('A title is required.')

  const [seriesIds, shelfIds, tagIds] = await Promise.all([
    resolveNamed(sql, 'series', user.id, input.series_name ? [input.series_name] : []),
    resolveNamed(sql, 'shelf', user.id, input.new_shelf_names ?? []),
    resolveNamed(sql, 'tag', user.id, input.new_tag_names ?? []),
  ])

  const row = toRow(input, user.id)
  const seriesId = seriesIds[0] ?? null

  const inserted = (await sql`
    insert into book (
      user_id, isbn10, isbn13, title, subtitle, authors, categories, publisher,
      page_count, edition, format, description, cover_image_url, google_books_id,
      language, published_date, location, condition, read_status, date_started,
      date_finished, rating, review_text, date_reviewed, series_id, series_position,
      price_paid, purchase_date, purchased_from, gift_from, estimated_value, notes
    ) values (
      ${row.user_id}, ${row.isbn10}, ${row.isbn13}, ${row.title}, ${row.subtitle},
      ${row.authors}::text[], ${row.categories}::text[], ${row.publisher}, ${row.page_count},
      ${row.edition}, ${row.format}, ${row.description}, ${row.cover_image_url},
      ${row.google_books_id}, ${row.language}, ${row.published_date}, ${row.location},
      ${row.condition}, ${row.read_status}, ${row.date_started}, ${row.date_finished},
      ${row.rating}, ${row.review_text}, ${row.date_reviewed}, ${seriesId}, ${row.series_position},
      ${row.price_paid}, ${row.purchase_date}, ${row.purchased_from}, ${row.gift_from},
      ${row.estimated_value}, ${row.notes}
    )
    returning id
  `) as { id: string }[]

  const bookId = inserted[0].id

  // Wishlist entries are not physically shelved, so shelf links are ignored
  // for them even if the client sent some.
  const shelves =
    (input.location ?? 'shelf') === 'wishlist'
      ? []
      : [...(input.shelf_ids ?? []), ...shelfIds]

  await Promise.all([
    setLinks(sql, 'book_shelf', bookId, shelves),
    setLinks(sql, 'book_tag', bookId, [...(input.tag_ids ?? []), ...tagIds]),
  ])

  revalidatePath('/library')
  revalidatePath('/wishlist')
  revalidatePath('/shelves')
  return { id: bookId }
}

export async function updateBook(id: string, input: BookInput): Promise<void> {
  const { sql, user } = await requireUser()

  if (!input.title?.trim()) throw new Error('A title is required.')

  const [seriesIds, shelfIds, tagIds] = await Promise.all([
    resolveNamed(sql, 'series', user.id, input.series_name ? [input.series_name] : []),
    resolveNamed(sql, 'shelf', user.id, input.new_shelf_names ?? []),
    resolveNamed(sql, 'tag', user.id, input.new_tag_names ?? []),
  ])

  const row = toRow(input, user.id)
  const seriesId = seriesIds[0] ?? null

  // user_id is immutable and left out of the SET list entirely, so a crafted
  // request can never reassign ownership through this path.
  await sql`
    update book set
      isbn10 = ${row.isbn10},
      isbn13 = ${row.isbn13},
      title = ${row.title},
      subtitle = ${row.subtitle},
      authors = ${row.authors}::text[],
      categories = ${row.categories}::text[],
      publisher = ${row.publisher},
      page_count = ${row.page_count},
      edition = ${row.edition},
      format = ${row.format},
      description = ${row.description},
      cover_image_url = ${row.cover_image_url},
      google_books_id = ${row.google_books_id},
      language = ${row.language},
      published_date = ${row.published_date},
      location = ${row.location},
      condition = ${row.condition},
      read_status = ${row.read_status},
      date_started = ${row.date_started},
      date_finished = ${row.date_finished},
      rating = ${row.rating},
      review_text = ${row.review_text},
      date_reviewed = ${row.date_reviewed},
      series_id = ${seriesId},
      series_position = ${row.series_position},
      price_paid = ${row.price_paid},
      purchase_date = ${row.purchase_date},
      purchased_from = ${row.purchased_from},
      gift_from = ${row.gift_from},
      estimated_value = ${row.estimated_value},
      notes = ${row.notes}
    where id = ${id} and user_id = ${user.id}
  `

  const shelves =
    (input.location ?? 'shelf') === 'wishlist'
      ? []
      : [...(input.shelf_ids ?? []), ...shelfIds]

  await Promise.all([
    setLinks(sql, 'book_shelf', id, shelves),
    setLinks(sql, 'book_tag', id, [...(input.tag_ids ?? []), ...tagIds]),
  ])

  revalidatePath('/library')
  revalidatePath('/wishlist')
  revalidatePath('/shelves')
  revalidatePath(`/library/${id}`)
}

/** Soft delete, so an accidental removal is recoverable in the database. */
export async function deleteBook(id: string): Promise<void> {
  const { sql, user } = await requireUser()
  await sql`
    update book set deleted_at = now()
    where id = ${id} and user_id = ${user.id}
  `

  revalidatePath('/library')
  revalidatePath('/wishlist')
  revalidatePath('/shelves')
}

/** Wishlist -> owned, carrying the metadata over (§8.2). */
export async function moveToShelves(
  id: string,
  shelfIds: string[],
  newShelfNames: string[] = []
): Promise<void> {
  const { sql, user } = await requireUser()

  const created = await resolveNamed(sql, 'shelf', user.id, newShelfNames)

  await sql`
    update book set location = 'shelf'
    where id = ${id} and user_id = ${user.id}
  `

  await setLinks(sql, 'book_shelf', id, [...shelfIds, ...created])

  revalidatePath('/library')
  revalidatePath('/wishlist')
  revalidatePath('/shelves')
  revalidatePath(`/library/${id}`)
}

export async function setReadStatus(
  id: string,
  status: ReadStatus
): Promise<void> {
  const { sql, user } = await requireUser()

  const today = new Date().toISOString().slice(0, 10)
  const rows = (await sql`
    select date_started, date_finished from book
    where id = ${id} and user_id = ${user.id}
  `) as { date_started: string | null; date_finished: string | null }[]
  const existing = rows[0] ?? null

  // Dates are filled in only when they are still blank, so re-marking a book
  // never overwrites a date the user entered by hand.
  let dateStarted: string | null
  let dateFinished: string | null
  if (status === 'reading') {
    dateStarted = existing?.date_started ?? today
    dateFinished = null
  } else if (status === 'read') {
    dateStarted = existing?.date_started ?? today
    dateFinished = existing?.date_finished ?? today
  } else {
    dateStarted = null
    dateFinished = null
  }

  await sql`
    update book set
      read_status = ${status},
      date_started = ${dateStarted},
      date_finished = ${dateFinished}
    where id = ${id} and user_id = ${user.id}
  `

  revalidatePath('/library')
  revalidatePath('/stats')
  revalidatePath(`/library/${id}`)
}

export async function saveReview(
  id: string,
  rating: number | null,
  reviewText: string | null
): Promise<void> {
  const { sql, user } = await requireUser()

  if (rating !== null && (rating < 1 || rating > 5)) {
    throw new Error('Rating must be between 1 and 5.')
  }

  const text = emptyToNull(reviewText)
  const dateReviewed = rating || text ? new Date().toISOString().slice(0, 10) : null

  await sql`
    update book set
      rating = ${rating},
      review_text = ${text},
      date_reviewed = ${dateReviewed}
    where id = ${id} and user_id = ${user.id}
  `

  revalidatePath('/library')
  revalidatePath(`/library/${id}`)
}
