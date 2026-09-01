import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookCover } from '@/components/BookCover'
import { Bookplate, InkFlourish } from '@/components/Ornaments'
import {
  ReadStatusControl,
  ReviewEditor,
  LoanPanel,
  MoveToShelvesButton,
  DeleteBookButton,
} from '@/components/BookDetailControls'
import { getBook, getLoanHistory, getShelves } from '@/lib/books'
import { formatIsbn } from '@/lib/isbn'
import { FORMAT_LABELS, CONDITION_LABELS, displayAuthors } from '@/lib/types'

export async function generateMetadata({ params }: PageProps<'/library/[id]'>) {
  const { id } = await params
  const book = await getBook(id)
  return { title: book ? `${book.title} - Arcane Athenaeum` : 'Arcane Athenaeum' }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex gap-3 py-1.5">
      <dt className="w-[112px] shrink-0 text-[12.5px] text-subtle">{label}</dt>
      <dd className="text-[13.5px] text-ink">{value}</dd>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-line bg-surface p-4">
      <h2
        className="mb-3 text-[15px] text-wax"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

export default async function BookDetailPage({ params }: PageProps<'/library/[id]'>) {
  const { id } = await params
  const book = await getBook(id)
  if (!book) notFound()

  const [loans, shelves] = await Promise.all([getLoanHistory(book.id), getShelves()])
  const isWishlist = book.location === 'wishlist'

  const money = (v: number | null) =>
    v === null ? null : `$${v.toFixed(2)}`

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link
          href={isWishlist ? '/wishlist' : '/library'}
          className="focus-ring rounded text-[13px] text-muted underline hover:text-ink"
        >
          Back to {isWishlist ? 'wishlist' : 'library'}
        </Link>
        {isWishlist ? (
          <span className="rounded-full border border-clay px-2.5 py-0.5 text-[11.5px] font-semibold uppercase tracking-wide text-clay">
            Wishlist
          </span>
        ) : null}
      </div>

      <div className="grid gap-7 md:grid-cols-[220px_1fr]">
        <div>
          <BookCover book={book} priority />

          <div className="mt-4 space-y-2">
            <Link
              href={`/library/${book.id}/edit`}
              className="focus-ring block rounded-[8px] border border-line-strong px-4 py-2 text-center text-[13.5px] font-semibold text-ink hover:bg-sunk"
            >
              Edit details
            </Link>
            {isWishlist ? (
              <MoveToShelvesButton
                bookId={book.id}
                shelves={shelves.map((s) => ({ id: s.id, name: s.name }))}
              />
            ) : null}
          </div>

          {/* The bookplate is the page's one decorative flourish, in the
              manner of a plate pasted inside a front cover. */}
          <Bookplate className="mt-6 w-full opacity-70" />
        </div>

        <div className="min-w-0 space-y-5">
          <header>
            <h1
              className="text-[27px] leading-tight text-ink"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {book.title}
            </h1>
            {book.subtitle ? (
              <p
                className="mt-1 text-[18px] leading-snug text-muted"
                style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
              >
                {book.subtitle}
              </p>
            ) : null}
            <p className="mt-2 text-[15px] text-ink">
              {displayAuthors(book.authors)}
            </p>

            {book.series ? (
              <p className="mt-1.5 text-[13.5px] text-muted">
                <Link
                  href={`/series/${book.series.id}`}
                  className="underline text-wax focus-ring rounded"
                >
                  {book.series.name}
                </Link>
                {book.series_position !== null ? `, book ${book.series_position}` : ''}
              </p>
            ) : null}
          </header>

          <InkFlourish />

          <Panel title="Reading">
            <div className="space-y-4">
              <ReadStatusControl bookId={book.id} status={book.read_status} />
              {book.date_started || book.date_finished ? (
                <p className="text-[12.5px] text-muted">
                  {book.date_started
                    ? `Started ${new Date(book.date_started).toLocaleDateString()}`
                    : ''}
                  {book.date_started && book.date_finished ? ' - ' : ''}
                  {book.date_finished
                    ? `finished ${new Date(book.date_finished).toLocaleDateString()}`
                    : ''}
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel title="Your review">
            <ReviewEditor
              bookId={book.id}
              rating={book.rating}
              reviewText={book.review_text}
              dateReviewed={book.date_reviewed}
            />
          </Panel>

          {book.shelves.length > 0 || book.tags.length > 0 ? (
            <Panel title="Filed under">
              <div className="flex flex-wrap gap-1.5">
                {book.shelves.map((shelf) => (
                  <Link
                    key={shelf.id}
                    href={`/library?shelf=${shelf.id}`}
                    className="focus-ring rounded-full border border-line bg-bg px-2.5 py-1 text-[12.5px] text-ink hover:border-line-strong"
                  >
                    {shelf.name}
                  </Link>
                ))}
                {book.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/library?tag=${tag.id}`}
                    className="focus-ring rounded-full border border-dashed border-line-strong px-2.5 py-1 text-[12.5px] text-muted hover:text-ink"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </Panel>
          ) : null}

          {book.description ? (
            <Panel title="About">
              <p
                className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {book.description}
              </p>
            </Panel>
          ) : null}

          <Panel title="Details">
            <dl>
              <Row label="ISBN" value={formatIsbn(book.isbn13 ?? book.isbn10)} />
              <Row label="Publisher" value={book.publisher} />
              <Row label="Published" value={book.published_date} />
              <Row label="Pages" value={book.page_count} />
              <Row label="Edition" value={book.edition} />
              <Row label="Format" value={book.format ? FORMAT_LABELS[book.format] : null} />
              <Row
                label="Condition"
                value={book.condition ? CONDITION_LABELS[book.condition] : null}
              />
              <Row label="Language" value={book.language} />
              <Row
                label="Categories"
                value={book.categories.length > 0 ? book.categories.join(', ') : null}
              />
              <Row label="Notes" value={book.notes} />
            </dl>
          </Panel>

          {!isWishlist ? (
            <Panel title="On loan">
              <LoanPanel
                bookId={book.id}
                activeLoan={book.active_loan}
                history={loans}
              />
            </Panel>
          ) : null}

          {!isWishlist &&
          (book.price_paid !== null ||
            book.purchase_date ||
            book.purchased_from ||
            book.gift_from ||
            book.estimated_value !== null) ? (
            <Panel title="Purchase and value">
              <dl>
                <Row label="Price paid" value={money(book.price_paid)} />
                <Row
                  label="Purchased"
                  value={
                    book.purchase_date
                      ? new Date(book.purchase_date).toLocaleDateString()
                      : null
                  }
                />
                <Row label="From" value={book.purchased_from} />
                <Row label="Gift from" value={book.gift_from} />
                <Row label="Est. value" value={money(book.estimated_value)} />
              </dl>
            </Panel>
          ) : null}

          <div className="pt-1">
            <DeleteBookButton bookId={book.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
