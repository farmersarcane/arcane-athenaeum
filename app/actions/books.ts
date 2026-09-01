'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from './_auth'
import { toIsbnPair } from '@/lib/isbn'
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

type Supabase = Awaited<ReturnType<typeof requireUser>>['supabase']

/** Find-or-create by name, so the pickers can accept new values inline. */
async function resolveNamed(
  supabase: Supabase,
  table: 'shelf' | 'tag' | 'series',
  userId: string,
  names: string[]
): Promise<string[]> {
  const cleaned = [...new Set(names.map((n) => n.trim()).filter(Boolean))]
  if (cleaned.length === 0) return []

  const { data: existing } = await supabase
    .from(table)
    .select('id, name')
    .eq('user_id', userId)
    .in('name', cleaned)

  const found = new Map(
    ((existing ?? []) as { id: string; name: string }[]).map((r) => [r.name, r.id])
  )
  const missing = cleaned.filter((n) => !found.has(n))

  if (missing.length > 0) {
    const { data: inserted, error } = await supabase
      .from(table)
      .insert(missing.map((name) => ({ user_id: userId, name })))
      .select('id, name')
    if (error) throw error
    for (const row of (inserted ?? []) as { id: string; name: string }[]) {
      found.set(row.name, row.id)
    }
  }

  return cleaned.map((n) => found.get(n)!).filter(Boolean)
}

async function setLinks(
  supabase: Supabase,
  table: 'book_shelf' | 'book_tag',
  column: 'shelf_id' | 'tag_id',
  bookId: string,
  ids: string[]
) {
  await supabase.from(table).delete().eq('book_id', bookId)
  if (ids.length === 0) return
  const rows = [...new Set(ids)].map((id) => ({ book_id: bookId, [column]: id }))
  const { error } = await supabase.from(table).insert(rows)
  if (error) throw error
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
  const { supabase, user } = await requireUser()

  if (!input.title?.trim()) throw new Error('A title is required.')

  const [seriesIds, shelfIds, tagIds] = await Promise.all([
    resolveNamed(supabase, 'series', user.id, input.series_name ? [input.series_name] : []),
    resolveNamed(supabase, 'shelf', user.id, input.new_shelf_names ?? []),
    resolveNamed(supabase, 'tag', user.id, input.new_tag_names ?? []),
  ])

  const { data, error } = await supabase
    .from('book')
    .insert({ ...toRow(input, user.id), series_id: seriesIds[0] ?? null })
    .select('id')
    .single()

  if (error) throw error
  const bookId = (data as { id: string }).id

  // Wishlist entries are not physically shelved, so shelf links are ignored
  // for them even if the client sent some.
  const shelves =
    (input.location ?? 'shelf') === 'wishlist'
      ? []
      : [...(input.shelf_ids ?? []), ...shelfIds]

  await Promise.all([
    setLinks(supabase, 'book_shelf', 'shelf_id', bookId, shelves),
    setLinks(supabase, 'book_tag', 'tag_id', bookId, [
      ...(input.tag_ids ?? []),
      ...tagIds,
    ]),
  ])

  revalidatePath('/library')
  revalidatePath('/wishlist')
  revalidatePath('/shelves')
  return { id: bookId }
}

export async function updateBook(id: string, input: BookInput): Promise<void> {
  const { supabase, user } = await requireUser()

  if (!input.title?.trim()) throw new Error('A title is required.')

  const [seriesIds, shelfIds, tagIds] = await Promise.all([
    resolveNamed(supabase, 'series', user.id, input.series_name ? [input.series_name] : []),
    resolveNamed(supabase, 'shelf', user.id, input.new_shelf_names ?? []),
    resolveNamed(supabase, 'tag', user.id, input.new_tag_names ?? []),
  ])

  const row = toRow(input, user.id)
  // user_id is immutable; leaving it in the update payload would let a crafted
  // request try to reassign ownership.
  delete (row as Partial<typeof row>).user_id

  const { error } = await supabase
    .from('book')
    .update({ ...row, series_id: seriesIds[0] ?? null })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error

  const shelves =
    (input.location ?? 'shelf') === 'wishlist'
      ? []
      : [...(input.shelf_ids ?? []), ...shelfIds]

  await Promise.all([
    setLinks(supabase, 'book_shelf', 'shelf_id', id, shelves),
    setLinks(supabase, 'book_tag', 'tag_id', id, [
      ...(input.tag_ids ?? []),
      ...tagIds,
    ]),
  ])

  revalidatePath('/library')
  revalidatePath('/wishlist')
  revalidatePath('/shelves')
  revalidatePath(`/library/${id}`)
}

/** Soft delete, so an accidental removal is recoverable in the database. */
export async function deleteBook(id: string): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('book')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw error

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
  const { supabase, user } = await requireUser()

  const created = await resolveNamed(supabase, 'shelf', user.id, newShelfNames)

  const { error } = await supabase
    .from('book')
    .update({ location: 'shelf' })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw error

  await setLinks(supabase, 'book_shelf', 'shelf_id', id, [...shelfIds, ...created])

  revalidatePath('/library')
  revalidatePath('/wishlist')
  revalidatePath('/shelves')
  revalidatePath(`/library/${id}`)
}

export async function setReadStatus(
  id: string,
  status: ReadStatus
): Promise<void> {
  const { supabase, user } = await requireUser()

  const today = new Date().toISOString().slice(0, 10)
  const { data: current } = await supabase
    .from('book')
    .select('date_started, date_finished')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const existing = current as { date_started: string | null; date_finished: string | null } | null

  // Dates are filled in only when they are still blank, so re-marking a book
  // never overwrites a date the user entered by hand.
  const patch: Record<string, string | null> = { read_status: status }
  if (status === 'reading') {
    patch.date_started = existing?.date_started ?? today
    patch.date_finished = null
  } else if (status === 'read') {
    patch.date_started = existing?.date_started ?? today
    patch.date_finished = existing?.date_finished ?? today
  } else {
    patch.date_started = null
    patch.date_finished = null
  }

  const { error } = await supabase
    .from('book')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw error

  revalidatePath('/library')
  revalidatePath('/stats')
  revalidatePath(`/library/${id}`)
}

export async function saveReview(
  id: string,
  rating: number | null,
  reviewText: string | null
): Promise<void> {
  const { supabase, user } = await requireUser()

  if (rating !== null && (rating < 1 || rating > 5)) {
    throw new Error('Rating must be between 1 and 5.')
  }

  const text = emptyToNull(reviewText)
  const { error } = await supabase
    .from('book')
    .update({
      rating,
      review_text: text,
      date_reviewed:
        rating || text ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw error

  revalidatePath('/library')
  revalidatePath(`/library/${id}`)
}
