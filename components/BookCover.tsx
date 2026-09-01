import { coverAlt } from '@/lib/types'
import type { Book } from '@/lib/types'

/**
 * Covers hold a 2:3 book aspect ratio whether or not an image exists, so the
 * grid never reflows as images arrive. Falls back to a typeset spine-like card
 * when there is no cover image.
 *
 * Google Books image URLs are hotlinked for now; self-hosting them in Supabase
 * Storage is on the v2 backlog because Google's URLs can 404 over time.
 */
export function BookCover({
  book,
  className = '',
  priority = false,
}: {
  book: Pick<Book, 'title' | 'authors' | 'cover_image_url'>
  className?: string
  priority?: boolean
}) {
  const shared =
    'w-full aspect-[2/3] rounded-[3px] overflow-hidden bg-sunk ' +
    'border border-line shadow-[0_1px_2px_rgba(42,33,24,0.14),0_6px_16px_rgba(42,33,24,0.10)]'

  if (!book.cover_image_url) {
    return (
      <div className={`${shared} ${className} flex flex-col justify-center p-3 text-center`}>
        <span
          className="text-[12px] leading-tight text-ink title-clamp-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {book.title}
        </span>
        {book.authors?.[0] ? (
          <span
            className="mt-1.5 text-[10px] leading-tight text-muted"
            style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
          >
            {book.authors[0]}
          </span>
        ) : null}
      </div>
    )
  }

  // Google Books serves covers from a host not worth adding to the image
  // optimizer's remote allowlist while the URLs remain hotlinked; self-hosting
  // them in Supabase Storage is the v2 fix.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={book.cover_image_url}
      alt={coverAlt(book)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`${shared} ${className} object-cover`}
    />
  )
}
