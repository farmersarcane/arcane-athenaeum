import Link from 'next/link'
import { BookCover } from './BookCover'
import { StaticRating } from './StarRating'
import { displayAuthors } from '@/lib/types'
import type { BookWithRelations } from '@/lib/types'

/** Loan badge, read-status dot, and rating are kept deliberately small so they
 *  never compete with the two-line title (spec 8.13). */
function LoanBadge() {
  return (
    <span
      className="absolute top-1.5 left-1.5 rounded px-1.5 py-[2px] text-[10px] font-semibold tracking-wide text-eggshell bg-wax shadow-sm"
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      ON LOAN
    </span>
  )
}

function StatusDot({ status }: { status: BookWithRelations['read_status'] }) {
  if (status === 'unread') return null
  const reading = status === 'reading'
  return (
    <span
      className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-eggshell"
      style={{ backgroundColor: reading ? 'var(--color-warning)' : 'var(--color-success)' }}
      role="img"
      aria-label={reading ? 'Currently reading' : 'Read'}
    />
  )
}

export function BookGrid({
  books,
  emptyState,
}: {
  books: BookWithRelations[]
  emptyState?: React.ReactNode
}) {
  if (books.length === 0) {
    return <>{emptyState ?? null}</>
  }

  return (
    <ul className="grid gap-x-4 gap-y-7 grid-cols-[repeat(auto-fill,minmax(118px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
      {books.map((book, i) => (
        <li key={book.id}>
          <Link
            href={`/library/${book.id}`}
            className="group block focus-ring rounded-[4px]"
          >
            <div className="relative">
              <BookCover
                book={book}
                priority={i < 12}
                className="transition-transform duration-150 group-hover:-translate-y-0.5"
              />
              {book.active_loan ? <LoanBadge /> : null}
              <StatusDot status={book.read_status} />
            </div>
            {/* Constrained to the cover's width by the grid cell itself. */}
            <p
              className="mt-2 text-[13px] leading-[1.25] title-clamp-2 text-ink"
              style={{ fontFamily: 'var(--font-display)' }}
              title={book.title}
            >
              {book.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted truncate">
              {displayAuthors(book.authors)}
            </p>
            {book.rating ? (
              <span className="mt-1 inline-block">
                <StaticRating rating={book.rating} size={11} />
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}
