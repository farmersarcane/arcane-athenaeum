import Link from 'next/link'
import { InkFlourish } from '@/components/Ornaments'
import { getSeriesSummaries } from '@/lib/books'

export const metadata = { title: 'Series - Arcane Athenaeum' }

export default async function SeriesPage() {
  const series = (await getSeriesSummaries()).filter((s) => s.books.length > 0)

  return (
    <div>
      <h1
        className="mb-1 text-[26px] text-wax"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Series
      </h1>
      <p className="mb-6 text-[14px] text-muted">
        What you have, and which numbers are still missing.
      </p>

      {series.length === 0 ? (
        <div className="parchment-tooth rounded-[12px] border border-line px-6 py-12 text-center">
          <InkFlourish className="mx-auto mb-5 max-w-[220px]" />
          <p className="text-[18px] text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            No series yet
          </p>
          <p
            className="mx-auto mt-2 max-w-[380px] text-[15px] text-muted"
            style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
          >
            Give a book a series name and number when you add or edit it, and it
            will show up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {series.map((s) => (
            <li key={s.id}>
              <Link
                href={`/series/${s.id}`}
                className="focus-ring block rounded-[10px] border border-line bg-surface p-4 hover:border-line-strong"
              >
                <span
                  className="block text-[17px] text-ink"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {s.name}
                </span>
                <span className="mt-1 block text-[13px] text-muted">
                  {s.books.length} {s.books.length === 1 ? 'book' : 'books'}
                  {s.missing_positions.length > 0
                    ? ` - missing ${s.missing_positions.join(', ')}`
                    : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
