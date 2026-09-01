'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { BOOK_FORMATS, FORMAT_LABELS, READ_STATUS_LABELS } from '@/lib/types'
import type { NamedOption } from './NamePicker'

export function LibraryFilters({
  shelves,
  tags,
  seriesOptions,
  authors,
}: {
  shelves: NamedOption[]
  tags: NamedOption[]
  seriesOptions: NamedOption[]
  authors: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const currentQuery = params.get('q') ?? ''

  function apply(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`${pathname}?${next.toString()}`)
  }

  const activeCount = ['shelf', 'tag', 'series', 'status', 'format', 'author', 'loaned']
    .filter((k) => params.get(k))
    .length

  return (
    <div className="mb-6 space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const input = e.currentTarget.elements.namedItem('q') as HTMLInputElement
          apply('q', input.value.trim())
        }}
        className="flex gap-2"
      >
        {/* Uncontrolled, keyed on the active query: navigating back or clearing
            a filter re-mounts the input with the right value, without an effect
            syncing state to the URL on every render. */}
        <input
          key={currentQuery}
          name="q"
          type="search"
          aria-label="Search your library"
          className="field"
          placeholder="Search title, author, publisher..."
          defaultValue={currentQuery}
        />
        <button
          type="submit"
          className="focus-ring shrink-0 rounded-[8px] border border-line-strong px-4 text-[13px] font-semibold text-ink hover:bg-sunk cursor-pointer"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Select label="Shelf" value={params.get('shelf') ?? ''} onChange={(v) => apply('shelf', v)}
          options={shelves.map((s) => ({ value: s.id, label: s.name }))} />
        <Select label="Tag" value={params.get('tag') ?? ''} onChange={(v) => apply('tag', v)}
          options={tags.map((t) => ({ value: t.id, label: t.name }))} />
        <Select label="Series" value={params.get('series') ?? ''} onChange={(v) => apply('series', v)}
          options={seriesOptions.map((s) => ({ value: s.id, label: s.name }))} />
        <Select label="Status" value={params.get('status') ?? ''} onChange={(v) => apply('status', v)}
          options={Object.entries(READ_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
        <Select label="Format" value={params.get('format') ?? ''} onChange={(v) => apply('format', v)}
          options={BOOK_FORMATS.map((f) => ({ value: f, label: FORMAT_LABELS[f] }))} />
        <Select label="Author" value={params.get('author') ?? ''} onChange={(v) => apply('author', v)}
          options={authors.map((a) => ({ value: a, label: a }))} />
        <Select label="Sort" value={params.get('sort') ?? ''} onChange={(v) => apply('sort', v)}
          placeholder="Recently added"
          options={[
            { value: 'title', label: 'Title' },
            { value: 'author', label: 'Author' },
            { value: 'rating', label: 'Rating' },
            { value: 'pages', label: 'Page count' },
          ]} />

        <button
          type="button"
          aria-pressed={params.get('loaned') === '1'}
          onClick={() => apply('loaned', params.get('loaned') === '1' ? '' : '1')}
          className={`focus-ring rounded-[8px] border px-3 py-1.5 text-[12.5px] font-semibold cursor-pointer ${
            params.get('loaned') === '1'
              ? 'border-wax bg-wax text-eggshell'
              : 'border-line bg-surface text-muted hover:text-ink'
          }`}
        >
          On loan
        </button>

        {activeCount > 0 || params.get('q') ? (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="focus-ring rounded-[8px] px-3 py-1.5 text-[12.5px] text-subtle underline hover:text-ink cursor-pointer"
          >
            Clear all
          </button>
        ) : null}
      </div>
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  if (options.length === 0) return null
  return (
    <label className="inline-flex items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 py-1.5">
      <span className="text-[12px] text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="bg-transparent text-[12.5px] font-semibold text-ink outline-none focus-ring rounded cursor-pointer max-w-[150px]"
      >
        <option value="">{placeholder ?? 'All'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
