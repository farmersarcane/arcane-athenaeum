import Link from 'next/link'
import { InkFlourish } from '@/components/Ornaments'
import { getShelvesWithPreviews } from '@/lib/books'
import { ShelfAdmin } from '@/components/ShelfAdmin'

export const metadata = { title: 'Shelves - Arcane Athenaeum' }

export default async function ShelvesPage() {
  const shelves = await getShelvesWithPreviews()

  return (
    <div>
      <h1
        className="mb-1 text-[26px] text-wax"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Shelves
      </h1>
      <p className="mb-6 text-[14px] text-muted">
        Topic and genre groupings. A book can sit on as many as you like.
      </p>

      <ShelfAdmin />

      {shelves.length === 0 ? (
        <div className="parchment-tooth mt-6 rounded-[12px] border border-line px-6 py-12 text-center">
          <InkFlourish className="mx-auto mb-5 max-w-[220px]" />
          <p
            className="text-[18px] text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            No shelves yet
          </p>
          <p
            className="mx-auto mt-2 max-w-[360px] text-[15px] text-muted"
            style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
          >
            Create one above, or make one on the fly while adding a book.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shelves.map((shelf) => (
            <li key={shelf.id}>
              <Link
                href={`/library?shelf=${shelf.id}`}
                className="focus-ring flex items-center gap-3 rounded-[10px] border border-line bg-surface p-3.5 hover:border-line-strong"
              >
                <span className="flex shrink-0 items-end">
                  {shelf.preview_covers.length === 0 ? (
                    <span className="h-[52px] w-[35px] rounded-[2px] border border-line bg-sunk" />
                  ) : (
                    shelf.preview_covers.map((cover, i) => (
                      <span
                        key={cover.id}
                        className="h-[52px] w-[35px] overflow-hidden rounded-[2px] border border-line bg-sunk"
                        style={{ marginLeft: i === 0 ? 0 : -15, zIndex: 10 - i }}
                      >
                        {cover.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover.cover_image_url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </span>
                    ))
                  )}
                </span>
                <span className="min-w-0">
                  <span
                    className="block truncate text-[15px] text-ink"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {shelf.name}
                  </span>
                  <span className="block text-[12.5px] text-muted">
                    {shelf.book_count} {shelf.book_count === 1 ? 'book' : 'books'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
