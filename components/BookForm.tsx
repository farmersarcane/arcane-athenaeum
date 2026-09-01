'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NamePicker, type NamedOption } from './NamePicker'
import { RatingInput } from './StarRating'
import { IsbnLookup, type DuplicateHit } from './IsbnLookup'
import type { VolumeCandidate } from '@/lib/googleBooks'
import type { BookInput } from '@/app/actions/books'
import {
  BOOK_FORMATS,
  FORMAT_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  READ_STATUS_LABELS,
  type BookFormat,
  type BookLocation,
  type Condition,
  type ReadStatus,
} from '@/lib/types'

export type BookFormValue = {
  isbn: string
  title: string
  subtitle: string
  authors: string
  categories: string
  publisher: string
  page_count: string
  edition: string
  format: BookFormat | ''
  description: string
  cover_image_url: string
  google_books_id: string
  language: string
  published_date: string
  location: BookLocation
  condition: Condition | ''
  read_status: ReadStatus
  date_started: string
  date_finished: string
  rating: number | null
  review_text: string
  series_name: string
  series_position: string
  price_paid: string
  purchase_date: string
  purchased_from: string
  gift_from: string
  estimated_value: string
  notes: string
  shelf_ids: string[]
  tag_ids: string[]
  new_shelf_names: string[]
  new_tag_names: string[]
}

export function emptyForm(location: BookLocation = 'shelf'): BookFormValue {
  return {
    isbn: '', title: '', subtitle: '', authors: '', categories: '',
    publisher: '', page_count: '', edition: '', format: '', description: '',
    cover_image_url: '', google_books_id: '', language: '', published_date: '',
    location, condition: '', read_status: 'unread', date_started: '',
    date_finished: '', rating: null, review_text: '', series_name: '',
    series_position: '', price_paid: '', purchase_date: '', purchased_from: '',
    gift_from: '', estimated_value: '', notes: '', shelf_ids: [], tag_ids: [],
    new_shelf_names: [], new_tag_names: [],
  }
}

export function toBookInput(v: BookFormValue): BookInput {
  const num = (s: string) => {
    const n = Number(s)
    return s.trim() === '' || Number.isNaN(n) ? null : n
  }
  return {
    isbn: v.isbn,
    title: v.title,
    subtitle: v.subtitle,
    // Comma-separated is the fastest thing to type and to paste out of a
    // lookup result; splitting here keeps the array shape the database wants.
    authors: v.authors.split(',').map((s) => s.trim()).filter(Boolean),
    categories: v.categories.split(',').map((s) => s.trim()).filter(Boolean),
    publisher: v.publisher,
    page_count: num(v.page_count),
    edition: v.edition,
    format: v.format || null,
    description: v.description,
    cover_image_url: v.cover_image_url,
    google_books_id: v.google_books_id,
    language: v.language,
    published_date: v.published_date,
    location: v.location,
    condition: v.condition || null,
    read_status: v.read_status,
    date_started: v.date_started,
    date_finished: v.date_finished,
    rating: v.rating,
    review_text: v.review_text,
    series_name: v.series_name.trim() || null,
    series_position: num(v.series_position),
    price_paid: num(v.price_paid),
    purchase_date: v.purchase_date,
    purchased_from: v.purchased_from,
    gift_from: v.gift_from,
    estimated_value: num(v.estimated_value),
    notes: v.notes,
    shelf_ids: v.shelf_ids,
    tag_ids: v.tag_ids,
    new_shelf_names: v.new_shelf_names,
    new_tag_names: v.new_tag_names,
  }
}

function Section({
  title,
  children,
  hint,
}: {
  title: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <section className="rounded-[10px] border border-line bg-surface p-4">
      <h2
        className="text-[15px] text-wax"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h2>
      {hint ? <p className="mt-0.5 mb-3 text-[12px] text-muted">{hint}</p> : <div className="mb-3" />}
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function BookForm({
  value,
  onChange,
  onSubmit,
  shelves,
  tags,
  submitLabel,
  submitting,
  error,
  showLocation = true,
  showLookup = true,
  extraActions,
}: {
  value: BookFormValue
  onChange: (next: BookFormValue) => void
  onSubmit: () => void
  shelves: NamedOption[]
  tags: NamedOption[]
  submitLabel: string
  submitting: boolean
  error: string | null
  showLocation?: boolean
  showLookup?: boolean
  extraActions?: React.ReactNode
}) {
  const [duplicates, setDuplicates] = useState<DuplicateHit[]>([])
  const set = <K extends keyof BookFormValue>(key: K, v: BookFormValue[K]) =>
    onChange({ ...value, [key]: v })

  /** Autofill from a chosen Google Books volume. Format and edition are left
   *  alone: Google does not report binding reliably (spec 7). */
  function applyCandidate(c: VolumeCandidate) {
    onChange({
      ...value,
      isbn: c.isbn13 ?? c.isbn10 ?? value.isbn,
      title: c.title,
      subtitle: c.subtitle ?? '',
      authors: c.authors.join(', '),
      categories: c.categories.join(', '),
      publisher: c.publisher ?? '',
      page_count: c.page_count ? String(c.page_count) : '',
      description: c.description ?? '',
      cover_image_url: c.cover_image_url ?? '',
      google_books_id: c.google_books_id ?? '',
      language: c.language ?? '',
      published_date: c.published_date ?? '',
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="space-y-4"
    >
      {showLookup ? (
        <IsbnLookup
          isbn={value.isbn}
          onIsbnChange={(isbn) => set('isbn', isbn)}
          onPick={applyCandidate}
          onDuplicates={setDuplicates}
        />
      ) : null}

      {duplicates.length > 0 ? (
        <div
          role="alert"
          className="rounded-[10px] border border-clay bg-clay/10 p-3.5"
        >
          <p className="text-[13.5px] font-semibold text-ink">
            {duplicates.length === 1
              ? 'That ISBN is already in your library.'
              : `That ISBN matches ${duplicates.length} books already in your library.`}
          </p>
          <ul className="mt-2 space-y-1">
            {duplicates.map((d) => (
              <li key={d.id} className="text-[13px] text-muted">
                <Link
                  href={`/library/${d.id}`}
                  className="underline text-wax focus-ring rounded"
                >
                  {d.title}
                </Link>
                {d.location === 'wishlist' ? ' (on your wishlist)' : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12.5px] text-muted">
            Keep going to add it anyway as a second copy, or open the existing
            entry above.
          </p>
        </div>
      ) : null}

      <Section title="The book">
        <div>
          <label className="label" htmlFor="title">Title *</label>
          <input
            id="title"
            required
            className="field"
            value={value.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="subtitle">Subtitle</label>
          <input
            id="subtitle"
            className="field"
            value={value.subtitle}
            onChange={(e) => set('subtitle', e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="authors">Author(s)</label>
          <input
            id="authors"
            className="field"
            placeholder="Separate multiple authors with commas"
            value={value.authors}
            onChange={(e) => set('authors', e.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="publisher">Publisher</label>
            <input
              id="publisher"
              className="field"
              value={value.publisher}
              onChange={(e) => set('publisher', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="published_date">Published</label>
            <input
              id="published_date"
              className="field"
              placeholder="e.g. 2019"
              value={value.published_date}
              onChange={(e) => set('published_date', e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="page_count">Pages</label>
            <input
              id="page_count"
              type="number"
              min={0}
              className="field"
              value={value.page_count}
              onChange={(e) => set('page_count', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="edition">Edition</label>
            <input
              id="edition"
              className="field"
              placeholder="e.g. 1st"
              value={value.edition}
              onChange={(e) => set('edition', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="format">Format</label>
            <select
              id="format"
              className="field"
              value={value.format}
              onChange={(e) => set('format', e.target.value as BookFormat | '')}
            >
              <option value="">Not set</option>
              {BOOK_FORMATS.map((f) => (
                <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="categories">Categories</label>
          <input
            id="categories"
            className="field"
            placeholder="Comma separated"
            value={value.categories}
            onChange={(e) => set('categories', e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={4}
            className="field"
            value={value.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>
      </Section>

      {showLocation ? (
        <Section
          title="Where it lives"
          hint="Wishlist books are not shelved yet, so shelves are skipped for them."
        >
          <div className="flex gap-2">
            {(['shelf', 'wishlist'] as BookLocation[]).map((loc) => (
              <button
                key={loc}
                type="button"
                aria-pressed={value.location === loc}
                onClick={() => set('location', loc)}
                className={`focus-ring flex-1 rounded-[8px] border px-3 py-2 text-[13.5px] font-semibold cursor-pointer ${
                  value.location === loc
                    ? 'border-wax bg-wax text-eggshell'
                    : 'border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                {loc === 'shelf' ? 'On my shelves' : 'On my wishlist'}
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Organize">
        {value.location === 'shelf' ? (
          <NamePicker
            label="Shelves"
            options={shelves}
            selectedIds={value.shelf_ids}
            newNames={value.new_shelf_names}
            onChangeSelected={(ids) => set('shelf_ids', ids)}
            onChangeNew={(names) => set('new_shelf_names', names)}
            placeholder="New shelf name"
          />
        ) : null}

        <NamePicker
          label="Tags"
          options={tags}
          selectedIds={value.tag_ids}
          newNames={value.new_tag_names}
          onChangeSelected={(ids) => set('tag_ids', ids)}
          onChangeNew={(names) => set('new_tag_names', names)}
          placeholder="New tag, e.g. signed copy"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="series_name">Series</label>
            <input
              id="series_name"
              className="field"
              placeholder="e.g. The Stormlight Archive"
              value={value.series_name}
              onChange={(e) => set('series_name', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="series_position">Book number</label>
            <input
              id="series_position"
              type="number"
              step="0.5"
              min={0}
              className="field"
              value={value.series_position}
              onChange={(e) => set('series_position', e.target.value)}
            />
          </div>
        </div>

        {value.location === 'shelf' ? (
          <div>
            <label className="label" htmlFor="condition">Condition</label>
            <select
              id="condition"
              className="field"
              value={value.condition}
              onChange={(e) => set('condition', e.target.value as Condition | '')}
            >
              <option value="">Not set</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
              ))}
            </select>
          </div>
        ) : null}
      </Section>

      <Section title="Reading">
        <div className="flex gap-2">
          {(Object.keys(READ_STATUS_LABELS) as ReadStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={value.read_status === status}
              onClick={() => set('read_status', status)}
              className={`focus-ring flex-1 rounded-[8px] border px-3 py-2 text-[13.5px] font-semibold cursor-pointer ${
                value.read_status === status
                  ? 'border-wax bg-wax text-eggshell'
                  : 'border-line bg-surface text-muted hover:text-ink'
              }`}
            >
              {READ_STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        {value.read_status !== 'unread' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="date_started">Started</label>
              <input
                id="date_started"
                type="date"
                className="field"
                value={value.date_started}
                onChange={(e) => set('date_started', e.target.value)}
              />
            </div>
            {value.read_status === 'read' ? (
              <div>
                <label className="label" htmlFor="date_finished">Finished</label>
                <input
                  id="date_finished"
                  type="date"
                  className="field"
                  value={value.date_finished}
                  onChange={(e) => set('date_finished', e.target.value)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <span className="label">Rating</span>
          <RatingInput value={value.rating} onChange={(r) => set('rating', r)} />
        </div>

        <div>
          <label className="label" htmlFor="review_text">Review</label>
          <textarea
            id="review_text"
            rows={4}
            className="field"
            placeholder="You can always come back and write this later."
            value={value.review_text}
            onChange={(e) => set('review_text', e.target.value)}
          />
        </div>
      </Section>

      {value.location === 'shelf' ? (
        <Section title="Purchase and value" hint="All optional. Kept private.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="price_paid">Price paid</label>
              <input
                id="price_paid"
                type="number"
                step="0.01"
                min={0}
                className="field"
                value={value.price_paid}
                onChange={(e) => set('price_paid', e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="estimated_value">Estimated value</label>
              <input
                id="estimated_value"
                type="number"
                step="0.01"
                min={0}
                className="field"
                value={value.estimated_value}
                onChange={(e) => set('estimated_value', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="purchase_date">Purchase date</label>
              <input
                id="purchase_date"
                type="date"
                className="field"
                value={value.purchase_date}
                onChange={(e) => set('purchase_date', e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="purchased_from">Purchased from</label>
              <input
                id="purchased_from"
                className="field"
                value={value.purchased_from}
                onChange={(e) => set('purchased_from', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="gift_from">Gift from</label>
            <input
              id="gift_from"
              className="field"
              placeholder="If it was a gift"
              value={value.gift_from}
              onChange={(e) => set('gift_from', e.target.value)}
            />
          </div>
        </Section>
      ) : null}

      <Section title="Notes">
        <textarea
          rows={3}
          aria-label="Notes"
          className="field"
          value={value.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </Section>

      {error ? (
        <p role="alert" className="text-[13.5px] text-wax">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="focus-ring rounded-[8px] bg-wax px-5 py-2.5 text-[15px] font-semibold text-eggshell hover:bg-wax-hover disabled:opacity-60 cursor-pointer"
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
        {extraActions}
      </div>
    </form>
  )
}
