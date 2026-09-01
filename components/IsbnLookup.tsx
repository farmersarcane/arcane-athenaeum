'use client'

import { useState } from 'react'
import { BarcodeScanner } from './BarcodeScanner'
import { isValidIsbn } from '@/lib/isbn'
import type { VolumeCandidate } from '@/lib/googleBooks'

export type DuplicateHit = {
  id: string
  title: string
  authors: string[]
  cover_image_url: string | null
  location: string
}

type LookupResponse = {
  candidates?: VolumeCandidate[]
  duplicates?: DuplicateHit[]
  error?: string
}

export async function lookupIsbn(isbn: string): Promise<LookupResponse> {
  const res = await fetch(`/api/lookup?isbn=${encodeURIComponent(isbn)}`)
  return (await res.json()) as LookupResponse
}

export function IsbnLookup({
  isbn,
  onIsbnChange,
  onPick,
  onDuplicates,
}: {
  isbn: string
  onIsbnChange: (isbn: string) => void
  onPick: (candidate: VolumeCandidate) => void
  onDuplicates: (hits: DuplicateHit[]) => void
}) {
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<VolumeCandidate[]>([])
  const [textQuery, setTextQuery] = useState('')

  async function runIsbnLookup(value: string) {
    if (!isValidIsbn(value)) {
      setStatus('That does not look like a valid ISBN.')
      return
    }
    setBusy(true)
    setStatus(null)
    setCandidates([])

    const data = await lookupIsbn(value)
    onDuplicates(data.duplicates ?? [])

    const found = data.candidates ?? []
    if (data.error) {
      setStatus(data.error)
    } else if (found.length === 0) {
      setStatus('No match found. Fill the details in by hand, or try a title search.')
    } else if (found.length === 1) {
      // A single unambiguous match fills the form straight away.
      onPick(found[0])
      setStatus(`Filled in from "${found[0].title}".`)
    } else {
      // Reprints and regional editions legitimately return several.
      setCandidates(found)
      setStatus(`${found.length} editions matched. Pick the one you have.`)
    }
    setBusy(false)
  }

  async function runTextSearch() {
    const q = textQuery.trim()
    if (q.length < 2) return
    setBusy(true)
    setStatus(null)
    setCandidates([])

    const res = await fetch(`/api/lookup?q=${encodeURIComponent(q)}`)
    const data = (await res.json()) as LookupResponse
    const found = data.candidates ?? []

    if (found.length === 0) {
      setStatus('Nothing matched that search.')
    } else {
      setCandidates(found)
      setStatus(`${found.length} results.`)
    }
    setBusy(false)
  }

  return (
    <section className="rounded-[10px] border border-line bg-surface p-4">
      <h2
        className="text-[15px] text-wax"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Find it by ISBN
      </h2>
      <p className="mt-0.5 mb-3 text-[12px] text-muted">
        Scan the barcode or type the number, and we will fill in what we can.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          inputMode="numeric"
          aria-label="ISBN"
          className="field flex-1 min-w-[180px]"
          placeholder="ISBN-10 or ISBN-13"
          value={isbn}
          onChange={(e) => onIsbnChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              runIsbnLookup(isbn)
            }
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => runIsbnLookup(isbn)}
          className="focus-ring rounded-[8px] border border-line-strong px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-sunk disabled:opacity-60 cursor-pointer"
        >
          {busy ? 'Looking...' : 'Look up'}
        </button>
        <button
          type="button"
          onClick={() => setScanning((s) => !s)}
          className="focus-ring rounded-[8px] border border-line-strong px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-sunk cursor-pointer"
        >
          {scanning ? 'Stop scan' : 'Scan'}
        </button>
      </div>

      {scanning ? (
        <div className="mt-3">
          <BarcodeScanner
            onDetected={(scanned) => {
              onIsbnChange(scanned)
              setScanning(false)
              runIsbnLookup(scanned)
            }}
            onClose={() => setScanning(false)}
          />
        </div>
      ) : null}

      {status ? (
        <p className="mt-2 text-[12.5px] text-muted" role="status">{status}</p>
      ) : null}

      {candidates.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {candidates.map((c, i) => (
            <li key={c.google_books_id ?? i}>
              <button
                type="button"
                onClick={() => {
                  onPick(c)
                  setCandidates([])
                  setStatus(`Filled in from "${c.title}".`)
                }}
                className="focus-ring flex w-full items-start gap-3 rounded-[8px] border border-line p-2 text-left hover:bg-sunk cursor-pointer"
              >
                {c.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.cover_image_url}
                    alt=""
                    loading="lazy"
                    className="h-[54px] w-[36px] shrink-0 rounded-[2px] object-cover"
                  />
                ) : (
                  <span className="h-[54px] w-[36px] shrink-0 rounded-[2px] bg-sunk" />
                )}
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-ink">{c.title}</span>
                  <span className="block text-[12px] text-muted">
                    {c.authors.join(', ') || 'Unknown author'}
                    {c.published_date ? ` - ${c.published_date}` : ''}
                    {c.publisher ? ` - ${c.publisher}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <details className="mt-3">
        <summary className="cursor-pointer text-[12.5px] text-muted focus-ring rounded">
          No barcode? Search by title instead
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="text"
            aria-label="Title or author search"
            className="field flex-1 min-w-[180px]"
            placeholder="Title or author"
            value={textQuery}
            onChange={(e) => setTextQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                runTextSearch()
              }
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={runTextSearch}
            className="focus-ring rounded-[8px] border border-line-strong px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-sunk disabled:opacity-60 cursor-pointer"
          >
            Search
          </button>
        </div>
      </details>
    </section>
  )
}
