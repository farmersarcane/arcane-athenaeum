'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BookForm, toBookInput, type BookFormValue } from './BookForm'
import { updateBook } from '@/app/actions/books'
import type { NamedOption } from './NamePicker'

export function EditBookForm({
  bookId,
  initial,
  shelves,
  tags,
}: {
  bookId: string
  initial: BookFormValue
  shelves: NamedOption[]
  tags: NamedOption[]
}) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        await updateBook(bookId, toBookInput(form))
        router.push(`/library/${bookId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong saving that.')
      }
    })
  }

  return (
    <BookForm
      value={form}
      onChange={setForm}
      onSubmit={save}
      shelves={shelves}
      tags={tags}
      submitLabel="Save changes"
      submitting={pending}
      error={error}
      // The ISBN panel stays available on edit so a book added by hand can be
      // enriched from Google Books later.
      showLookup
      showLocation
      extraActions={
        <button
          type="button"
          onClick={() => router.push(`/library/${bookId}`)}
          className="focus-ring rounded-[8px] border border-line-strong px-4 py-2.5 text-[14px] font-semibold text-ink hover:bg-sunk cursor-pointer"
        >
          Cancel
        </button>
      }
    />
  )
}
