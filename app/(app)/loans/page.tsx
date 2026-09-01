import Link from 'next/link'
import { BookCover } from '@/components/BookCover'
import { InkFlourish } from '@/components/Ornaments'
import { getActiveLoans } from '@/lib/books'
import { displayAuthors } from '@/lib/types'

export const metadata = { title: 'Loans - Arcane Athenaeum' }

export default async function LoansPage() {
  const books = await getActiveLoans()
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <h1
        className="mb-1 text-[26px] text-wax"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Out on loan
      </h1>
      <p className="mb-6 text-[14px] text-muted">
        {books.length} {books.length === 1 ? 'book is' : 'books are'} with someone else.
      </p>

      {books.length === 0 ? (
        <div className="parchment-tooth rounded-[12px] border border-line px-6 py-12 text-center">
          <InkFlourish className="mx-auto mb-5 max-w-[220px]" />
          <p className="text-[18px] text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Everything is on the shelf
          </p>
          <p
            className="mx-auto mt-2 max-w-[380px] text-[15px] text-muted"
            style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
          >
            When you lend a book out, record it on that book&apos;s page and it
            will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {books.map((book) => {
            const loan = book.active_loan!
            const overdue = loan.due_date !== null && loan.due_date < today
            return (
              <li key={book.id}>
                <Link
                  href={`/library/${book.id}`}
                  className="focus-ring flex items-center gap-3.5 rounded-[10px] border border-line bg-surface p-3 hover:border-line-strong"
                >
                  <span className="w-[44px] shrink-0">
                    <BookCover book={book} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] text-ink">
                      {book.title}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {displayAuthors(book.authors)}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-ink">
                      With <strong>{loan.borrower_name}</strong> since{' '}
                      {new Date(loan.date_loaned).toLocaleDateString()}
                    </span>
                  </span>
                  {loan.due_date ? (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                        overdue ? 'bg-wax text-eggshell' : 'bg-sunk text-muted'
                      }`}
                    >
                      {overdue ? 'Overdue' : `Due ${new Date(loan.due_date).toLocaleDateString()}`}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
