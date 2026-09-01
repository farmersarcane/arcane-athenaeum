'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookForm, emptyForm, toBookInput, type BookFormValue } from './BookForm'
import { ShelfPickerCards } from './ShelfPickerCards'
import { createBook } from '@/app/actions/books'
import type { ShelfWithPreview } from '@/lib/books'
import type { NamedOption } from './NamePicker'
import type { BookLocation } from '@/lib/types'

type Step = 'location' | 'shelves' | 'details'

function StepHeader({ step, batch }: { step: Step; batch: boolean }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'location', label: 'Where' },
    { key: 'shelves', label: 'Shelves' },
    { key: 'details', label: 'Details' },
  ]
  return (
    <ol className="mb-5 flex items-center gap-2 text-[12px]">
      {steps.map((s, i) => {
        const active = s.key === step
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 font-semibold ${
                active ? 'bg-wax text-eggshell' : 'bg-sunk text-muted'
              }`}
            >
              {i + 1}. {s.label}
            </span>
            {i < steps.length - 1 ? <span className="text-subtle">-</span> : null}
          </li>
        )
      })}
      {batch ? (
        <li className="ml-auto rounded-full border border-clay px-2.5 py-1 font-semibold text-clay">
          Batch mode
        </li>
      ) : null}
    </ol>
  )
}

export function AddBookFlow({
  shelves,
  tags,
}: {
  shelves: ShelfWithPreview[]
  tags: NamedOption[]
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('location')
  const [form, setForm] = useState<BookFormValue>(emptyForm('shelf'))
  const [batch, setBatch] = useState(false)
  const [added, setAdded] = useState<{ id: string; title: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const shelfOptions: NamedOption[] = shelves.map((s) => ({ id: s.id, name: s.name }))

  function chooseLocation(location: BookLocation) {
    setForm((f) => ({ ...f, location }))
    // Wishlist books are not shelved, so the shelf step is skipped entirely.
    setStep(location === 'wishlist' ? 'details' : 'shelves')
  }

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        const { id } = await createBook(toBookInput(form))

        if (batch) {
          // Keep the location and shelf choices; clear only the book itself, so
          // a stack can be scanned one after another without re-picking.
          setAdded((prev) => [{ id, title: form.title }, ...prev])
          setForm((f) => ({
            ...emptyForm(f.location),
            shelf_ids: f.shelf_ids,
            new_shelf_names: f.new_shelf_names,
          }))
        } else {
          router.push(`/library/${id}`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong saving that book.')
      }
    })
  }

  return (
    <div>
      <StepHeader step={step} batch={batch} />

      {step === 'location' ? (
        <section>
          <h1
            className="mb-1 text-[24px] text-wax"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Add a book
          </h1>
          <p className="mb-5 text-[14px] text-muted">
            Is this one you own, or one you want?
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => chooseLocation('shelf')}
              className="focus-ring rounded-[10px] border border-line bg-surface p-5 text-left hover:border-wax cursor-pointer"
            >
              <span className="block text-[17px] text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                On my shelves
              </span>
              <span className="mt-1 block text-[13px] text-muted">
                A book you own. You will pick which shelves it goes on next.
              </span>
            </button>

            <button
              type="button"
              onClick={() => chooseLocation('wishlist')}
              className="focus-ring rounded-[10px] border border-line bg-surface p-5 text-left hover:border-wax cursor-pointer"
            >
              <span className="block text-[17px] text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                On my wishlist
              </span>
              <span className="mt-1 block text-[13px] text-muted">
                Something you spotted and want to remember. No shelf needed yet.
              </span>
            </button>
          </div>
        </section>
      ) : null}

      {step === 'shelves' ? (
        <section>
          <h1
            className="mb-1 text-[24px] text-wax"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Which shelves?
          </h1>
          <p className="mb-5 text-[14px] text-muted">
            Pick as many as apply, or skip and sort it later.
          </p>

          <ShelfPickerCards
            shelves={shelves}
            selectedIds={form.shelf_ids}
            onToggle={(id) =>
              setForm((f) => ({
                ...f,
                shelf_ids: f.shelf_ids.includes(id)
                  ? f.shelf_ids.filter((s) => s !== id)
                  : [...f.shelf_ids, id],
              }))
            }
            newNames={form.new_shelf_names}
            onAddNew={(name) =>
              setForm((f) =>
                f.new_shelf_names.some((n) => n.toLowerCase() === name.toLowerCase())
                  ? f
                  : { ...f, new_shelf_names: [...f.new_shelf_names, name] }
              )
            }
            onRemoveNew={(name) =>
              setForm((f) => ({
                ...f,
                new_shelf_names: f.new_shelf_names.filter((n) => n !== name),
              }))
            }
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep('details')}
              className="focus-ring rounded-[8px] bg-wax px-5 py-2.5 text-[15px] font-semibold text-eggshell hover:bg-wax-hover cursor-pointer"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => setStep('location')}
              className="focus-ring rounded-[8px] border border-line-strong px-4 py-2.5 text-[14px] font-semibold text-ink hover:bg-sunk cursor-pointer"
            >
              Back
            </button>
          </div>
        </section>
      ) : null}

      {step === 'details' ? (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="text-[24px] text-wax"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Book details
              </h1>
              <p className="text-[13px] text-muted">
                Adding to{' '}
                <strong className="text-ink">
                  {form.location === 'wishlist' ? 'your wishlist' : 'your shelves'}
                </strong>
                {' - '}
                <button
                  type="button"
                  onClick={() => setStep('location')}
                  className="underline focus-ring rounded cursor-pointer"
                >
                  change
                </button>
              </p>
            </div>

            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={batch}
                onChange={(e) => setBatch(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-wax)]"
              />
              Scan several in a row
            </label>
          </div>

          {batch && added.length > 0 ? (
            <div className="mb-4 rounded-[10px] border border-line bg-surface p-3">
              <p className="text-[13px] font-semibold text-ink">
                Added this session ({added.length})
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {added.slice(0, 8).map((b) => (
                  <li key={b.id} className="text-[12.5px] text-muted">
                    <Link href={`/library/${b.id}`} className="underline focus-ring rounded">
                      {b.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <BookForm
            value={form}
            onChange={setForm}
            onSubmit={save}
            shelves={shelfOptions}
            tags={tags}
            submitLabel={batch ? 'Save and scan the next' : 'Add to library'}
            submitting={pending}
            error={error}
            showLocation={false}
            extraActions={
              <button
                type="button"
                onClick={() => setStep(form.location === 'wishlist' ? 'location' : 'shelves')}
                className="focus-ring rounded-[8px] border border-line-strong px-4 py-2.5 text-[14px] font-semibold text-ink hover:bg-sunk cursor-pointer"
              >
                Back
              </button>
            }
          />
        </section>
      ) : null}
    </div>
  )
}
