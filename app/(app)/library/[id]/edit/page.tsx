import { notFound } from 'next/navigation'
import { EditBookForm } from '@/components/EditBookForm'
import { getBook, getShelves, getTags } from '@/lib/books'
import type { BookFormValue } from '@/components/BookForm'

export const metadata = { title: 'Edit book - Arcane Athenaeum' }

export default async function EditBookPage({ params }: PageProps<'/library/[id]/edit'>) {
  const { id } = await params
  const [book, shelves, tags] = await Promise.all([getBook(id), getShelves(), getTags()])
  if (!book) notFound()

  const initial: BookFormValue = {
    isbn: book.isbn13 ?? book.isbn10 ?? '',
    title: book.title,
    subtitle: book.subtitle ?? '',
    authors: book.authors.join(', '),
    categories: book.categories.join(', '),
    publisher: book.publisher ?? '',
    page_count: book.page_count !== null ? String(book.page_count) : '',
    edition: book.edition ?? '',
    format: book.format ?? '',
    description: book.description ?? '',
    cover_image_url: book.cover_image_url ?? '',
    google_books_id: book.google_books_id ?? '',
    language: book.language ?? '',
    published_date: book.published_date ?? '',
    location: book.location,
    condition: book.condition ?? '',
    read_status: book.read_status,
    date_started: book.date_started ?? '',
    date_finished: book.date_finished ?? '',
    rating: book.rating,
    review_text: book.review_text ?? '',
    series_name: book.series?.name ?? '',
    series_position: book.series_position !== null ? String(book.series_position) : '',
    price_paid: book.price_paid !== null ? String(book.price_paid) : '',
    purchase_date: book.purchase_date ?? '',
    purchased_from: book.purchased_from ?? '',
    gift_from: book.gift_from ?? '',
    estimated_value: book.estimated_value !== null ? String(book.estimated_value) : '',
    notes: book.notes ?? '',
    shelf_ids: book.shelves.map((s) => s.id),
    tag_ids: book.tags.map((t) => t.id),
    new_shelf_names: [],
    new_tag_names: [],
  }

  return (
    <div>
      <h1
        className="mb-5 text-[24px] text-wax"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Edit {book.title}
      </h1>
      <EditBookForm
        bookId={book.id}
        initial={initial}
        shelves={shelves.map((s) => ({ id: s.id, name: s.name }))}
        tags={tags.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  )
}
