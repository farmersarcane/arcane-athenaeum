import Link from 'next/link'
import { BookGrid } from '@/components/BookGrid'
import { InkFlourish } from '@/components/Ornaments'
import { getBooks } from '@/lib/books'

export const metadata = { title: 'Wishlist - Arcane Athenaeum' }

export default async function WishlistPage() {
  const books = await getBooks({ location: 'wishlist', sort: 'recent' })

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1
          className="text-[26px] text-wax"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Wishlist
        </h1>
        <p className="text-[13px] text-muted">
          {books.length} {books.length === 1 ? 'book' : 'books'}
        </p>
      </div>

      <BookGrid
        books={books}
        emptyState={
          <div className="parchment-tooth rounded-[12px] border border-line px-6 py-14 text-center">
            <InkFlourish className="mx-auto mb-5 max-w-[220px]" />
            <p
              className="text-[19px] text-ink"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Nothing on the wishlist
            </p>
            <p
              className="mx-auto mt-2 max-w-[400px] text-[15px] text-muted"
              style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
            >
              Next time a book catches your eye in a shop, scan it here and it
              will be waiting when you get home.
            </p>
            <Link
              href="/add"
              className="focus-ring mt-6 inline-block rounded-[8px] bg-wax px-5 py-2.5 text-[15px] font-semibold text-eggshell hover:bg-wax-hover"
            >
              Add to wishlist
            </Link>
          </div>
        }
      />
    </div>
  )
}
