import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookCover } from '@/components/BookCover'
import { StaticRating } from '@/components/StarRating'
import { InkFlourish } from '@/components/Ornaments'
import { getSeriesSummaries } from '@/lib/books'
import { READ_STATUS_LABELS } from '@/lib/types'

export default async function SeriesDetailPage({ params }: PageProps<'/series/[id]'>) {
  const { id } = await params
  const series = (await getSeriesSummaries()).find((s) => s.id === id)
  if (!series) notFound()

  return (
    <div>
      <Link
        href="/series"
        className="focus-ring rounded text-[13px] text-muted underline hover:text-ink"
      >
        Back to series
      </Link>

      <h1
        className="mt-3 text-[27px] text-wax"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {series.name}
      </h1>
      <p className="mt-1 text-[14px] text-muted">
        {series.books.length} {series.books.length === 1 ? 'book' : 'books'} cataloged
      </p>

      {series.missing_positions.length > 0 ? (
        <p className="mt-3 rounded-[10px] border border-clay bg-clay/10 px-3.5 py-2.5 text-[13.5px] text-ink">
          You are missing{' '}
          {series.missing_positions.length === 1 ? 'book' : 'books'}{' '}
          {series.missing_positions.join(', ')} in this series.
        </p>
      ) : null}

      <InkFlourish className="my-6" />

      <ul className="space-y-2">
        {series.books.map((book) => (
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
                  {book.series_position !== null ? `${book.series_position}. ` : ''}
                  {book.title}
                </span>
                <span className="block text-[12.5px] text-muted">
                  {READ_STATUS_LABELS[book.read_status]}
                  {book.location === 'wishlist' ? ' - on your wishlist' : ''}
                </span>
              </span>
              {book.rating ? <StaticRating rating={book.rating} size={13} /> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
