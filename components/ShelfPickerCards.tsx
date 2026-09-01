'use client'

import type { ShelfWithPreview } from '@/lib/books'

/**
 * Step 2 of the add flow. Each shelf card previews a small stack of covers
 * already filed there, so the choice is made with context on what is on that
 * shelf rather than from a bare list of names (spec 7, step 2).
 */
export function ShelfPickerCards({
  shelves,
  selectedIds,
  onToggle,
  newNames,
  onAddNew,
  onRemoveNew,
}: {
  shelves: ShelfWithPreview[]
  selectedIds: string[]
  onToggle: (id: string) => void
  newNames: string[]
  onAddNew: (name: string) => void
  onRemoveNew: (name: string) => void
}) {
  return (
    <div className="space-y-4">
      {shelves.length === 0 && newNames.length === 0 ? (
        <p className="text-[14px] text-muted">
          You have no shelves yet. Create your first one below.
        </p>
      ) : null}

      {shelves.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shelves.map((shelf) => {
            const on = selectedIds.includes(shelf.id)
            return (
              <li key={shelf.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggle(shelf.id)}
                  className={`focus-ring flex w-full items-center gap-3 rounded-[10px] border p-3 text-left cursor-pointer transition-colors ${
                    on
                      ? 'border-wax bg-clay/10'
                      : 'border-line bg-surface hover:border-line-strong'
                  }`}
                >
                  {/* Overlapping spines, the way they would sit on a shelf. */}
                  <span className="flex shrink-0 items-end">
                    {shelf.preview_covers.length === 0 ? (
                      <span className="h-[42px] w-[28px] rounded-[2px] border border-line bg-sunk" />
                    ) : (
                      shelf.preview_covers.map((cover, i) => (
                        <span
                          key={cover.id}
                          className="h-[42px] w-[28px] overflow-hidden rounded-[2px] border border-line bg-sunk"
                          style={{ marginLeft: i === 0 ? 0 : -12, zIndex: 10 - i }}
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

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">
                      {shelf.name}
                    </span>
                    <span className="block text-[12px] text-muted">
                      {shelf.book_count} {shelf.book_count === 1 ? 'book' : 'books'}
                    </span>
                  </span>

                  {on ? (
                    <span className="shrink-0 text-[12px] font-semibold text-wax">
                      Selected
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {newNames.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {newNames.map((name) => (
            <li
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-clay bg-clay/10 px-3 py-1.5 text-[13px] text-ink"
            >
              {name}
              <span className="text-[10px] uppercase tracking-wide text-clay">new</span>
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => onRemoveNew(name)}
                className="focus-ring rounded cursor-pointer text-muted hover:text-ink"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <NewShelfInput onAdd={onAddNew} />
    </div>
  )
}

function NewShelfInput({ onAdd }: { onAdd: (name: string) => void }) {
  return (
    <form
      // Its own form element so Enter creates a shelf instead of advancing the
      // outer add flow.
      onSubmit={(e) => {
        e.preventDefault()
        const input = e.currentTarget.elements.namedItem('shelfName') as HTMLInputElement
        const clean = input.value.trim()
        if (!clean) return
        onAdd(clean)
        input.value = ''
      }}
      className="flex gap-2"
    >
      <input
        name="shelfName"
        type="text"
        aria-label="New shelf name"
        placeholder="+ New shelf, e.g. Fantasy"
        className="field"
      />
      <button
        type="submit"
        className="focus-ring shrink-0 rounded-[8px] border border-line-strong px-3.5 text-[13px] font-semibold text-ink hover:bg-sunk cursor-pointer"
      >
        Create
      </button>
    </form>
  )
}
