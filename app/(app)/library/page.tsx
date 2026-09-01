import Link from 'next/link'
import { BookGrid } from '@/components/BookGrid'
import { LibraryFilters } from '@/components/LibraryFilters'
import { InkFlourish } from '@/components/Ornaments'
import { getBooks, getShelves, getTags, getSeriesList, getAuthors, type BookFilters } from '@/lib/books'
import type { ReadStatus } from '@/lib/types'

export const metadata = { title: 'Library - Arcane Athenaeum' }

export default async function LibraryPage({ searchParams }: PageProps<'/library'>) {
  const sp = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

  const filters: BookFilters = {
    location: 'shelf',
    shelfId: one(sp.shelf),
    tagId: one(sp.tag),
    seriesId: one(sp.series),
    readStatus: one(sp.status) as ReadStatus | undefined,
    format: one(sp.format),
    author: one(sp.author),
    search: one(sp.q),
    onLoan: one(sp.loaned) === '1',
    sort: one(sp.sort) as BookFilters['sort'],
  }

  // Author options come from what is actually cataloged, so the filter never
  // offers a name with no books behind it.
  const [books, shelves, tags, seriesList, authors] = await Promise.all([
    getBooks(filters),
    getShelves(),
    getTags(),
    getSeriesList(),
    getAuthors(),
  ])

  const filtered = Object.entries(sp).some(([, v]) => v)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1
          className="text-[26px] text-wax"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Library
        </h1>
        <p className="text-[13px] text-muted">
          {books.length} {books.length === 1 ? 'book' : 'books'}
          {filtered ? ' matching' : ''}
        </p>
      </div>

      <LibraryFilters
        shelves={shelves.map((s) => ({ id: s.id, name: s.name }))}
        tags={tags.map((t) => ({ id: t.id, name: t.name }))}
        seriesOptions={seriesList.map((s) => ({ id: s.id, name: s.name }))}
        authors={authors}
      />

      <BookGrid
        books={books}
        emptyState={
          <div className="parchment-tooth rounded-[12px] border border-line px-6 py-14 text-center">
            <InkFlourish className="mx-auto mb-5 max-w-[220px]" />
            <p
              className="text-[19px] text-ink"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {filtered ? 'Nothing matches those filters' : 'Your shelves are empty'}
            </p>
            <p
              className="mx-auto mt-2 max-w-[380px] text-[15px] text-muted"
              style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
            >
              {filtered
                ? 'Try clearing a filter or two.'
                : 'Scan the barcode on a book you own and it will fill itself in.'}
            </p>
            {!filtered ? (
              <Link
                href="/add"
                className="focus-ring mt-6 inline-block rounded-[8px] bg-wax px-5 py-2.5 text-[15px] font-semibold text-eggshell hover:bg-wax-hover"
              >
                Add your first book
              </Link>
            ) : null}
          </div>
        }
      />
    </div>
  )
}
