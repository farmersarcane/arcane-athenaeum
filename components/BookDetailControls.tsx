'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RatingInput, StaticRating } from './StarRating'
import { setReadStatus, saveReview, deleteBook, moveToShelves } from '@/app/actions/books'
import { loanOut, markReturned } from '@/app/actions/loans'
import { READ_STATUS_LABELS, type ReadStatus, type Loan } from '@/lib/types'
import type { NamedOption } from './NamePicker'

function useAction() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<unknown>, after?: () => void) => {
    setError(null)
    startTransition(async () => {
      try {
        await fn()
        after?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That did not work.')
      }
    })
  }
  return { pending, error, run }
}

export function ReadStatusControl({
  bookId,
  status,
}: {
  bookId: string
  status: ReadStatus
}) {
  const { pending, error, run } = useAction()

  return (
    <div>
      <div className="flex gap-1.5" role="group" aria-label="Reading status">
        {(Object.keys(READ_STATUS_LABELS) as ReadStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            aria-pressed={status === s}
            onClick={() => run(() => setReadStatus(bookId, s))}
            className={`focus-ring rounded-[7px] border px-3 py-1.5 text-[12.5px] font-semibold cursor-pointer disabled:opacity-60 ${
              status === s
                ? 'border-wax bg-wax text-eggshell'
                : 'border-line bg-surface text-muted hover:text-ink'
            }`}
          >
            {READ_STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="mt-1.5 text-[12.5px] text-wax">{error}</p> : null}
    </div>
  )
}

export function ReviewEditor({
  bookId,
  rating,
  reviewText,
  dateReviewed,
}: {
  bookId: string
  rating: number | null
  reviewText: string | null
  dateReviewed: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [draftRating, setDraftRating] = useState(rating)
  const [draftText, setDraftText] = useState(reviewText ?? '')
  const { pending, error, run } = useAction()

  if (!editing) {
    return (
      <div>
        {rating || reviewText ? (
          <>
            {rating ? (
              <div className="flex items-center gap-2">
                <StaticRating rating={rating} size={18} />
                {dateReviewed ? (
                  <span className="text-[12px] text-subtle">
                    reviewed {new Date(dateReviewed).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
            ) : null}
            {reviewText ? (
              <p
                className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {reviewText}
              </p>
            ) : null}
          </>
        ) : (
          <p
            className="text-[15px] text-muted"
            style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
          >
            Not rated or reviewed yet.
          </p>
        )}

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="focus-ring mt-3 rounded-[7px] border border-line-strong px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-sunk cursor-pointer"
        >
          {rating || reviewText ? 'Edit review' : 'Add a review'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <RatingInput value={draftRating} onChange={setDraftRating} size={26} />
      <textarea
        rows={5}
        aria-label="Review"
        className="field"
        value={draftText}
        onChange={(e) => setDraftText(e.target.value)}
        placeholder="What did you make of it?"
      />
      {error ? <p role="alert" className="text-[12.5px] text-wax">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => saveReview(bookId, draftRating, draftText),
              () => setEditing(false)
            )
          }
          className="focus-ring rounded-[8px] bg-wax px-4 py-2 text-[13.5px] font-semibold text-eggshell hover:bg-wax-hover disabled:opacity-60 cursor-pointer"
        >
          {pending ? 'Saving...' : 'Save review'}
        </button>
        <button
          type="button"
          onClick={() => {
            setDraftRating(rating)
            setDraftText(reviewText ?? '')
            setEditing(false)
          }}
          className="focus-ring rounded-[8px] border border-line-strong px-4 py-2 text-[13.5px] font-semibold text-ink hover:bg-sunk cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function LoanPanel({
  bookId,
  activeLoan,
  history,
}: {
  bookId: string
  activeLoan: Loan | null
  history: Loan[]
}) {
  const [opening, setOpening] = useState(false)
  const [name, setName] = useState('')
  const [due, setDue] = useState('')
  const [notes, setNotes] = useState('')
  const { pending, error, run } = useAction()

  const past = history.filter((l) => l.date_returned !== null)

  return (
    <div>
      {activeLoan ? (
        <div className="rounded-[10px] border border-clay bg-clay/10 p-3.5">
          <p className="text-[14px] text-ink">
            Loaned to <strong>{activeLoan.borrower_name}</strong> on{' '}
            {new Date(activeLoan.date_loaned).toLocaleDateString()}
            {activeLoan.due_date
              ? `, due back ${new Date(activeLoan.due_date).toLocaleDateString()}`
              : ''}
            .
          </p>
          {activeLoan.notes ? (
            <p className="mt-1 text-[13px] text-muted">{activeLoan.notes}</p>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => markReturned(activeLoan.id, bookId))}
            className="focus-ring mt-2.5 rounded-[8px] bg-wax px-4 py-2 text-[13px] font-semibold text-eggshell hover:bg-wax-hover disabled:opacity-60 cursor-pointer"
          >
            {pending ? 'Saving...' : 'Mark returned'}
          </button>
        </div>
      ) : opening ? (
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="borrower">Who has it?</label>
            <input
              id="borrower"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Borrower's name"
            />
          </div>
          <div>
            <label className="label" htmlFor="due">Due back (optional)</label>
            <input
              id="due"
              type="date"
              className="field"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="loanNotes">Notes (optional)</label>
            <input
              id="loanNotes"
              className="field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error ? <p role="alert" className="text-[12.5px] text-wax">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => loanOut(bookId, name, due || null, notes || null),
                  () => {
                    setOpening(false)
                    setName('')
                    setDue('')
                    setNotes('')
                  }
                )
              }
              className="focus-ring rounded-[8px] bg-wax px-4 py-2 text-[13.5px] font-semibold text-eggshell hover:bg-wax-hover disabled:opacity-60 cursor-pointer"
            >
              {pending ? 'Saving...' : 'Loan it out'}
            </button>
            <button
              type="button"
              onClick={() => setOpening(false)}
              className="focus-ring rounded-[8px] border border-line-strong px-4 py-2 text-[13.5px] font-semibold text-ink hover:bg-sunk cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpening(true)}
          className="focus-ring rounded-[8px] border border-line-strong px-4 py-2 text-[13.5px] font-semibold text-ink hover:bg-sunk cursor-pointer"
        >
          Loan this book out
        </button>
      )}

      {past.length > 0 ? (
        <div className="mt-4">
          <p className="text-[12.5px] font-semibold text-muted">Loan history</p>
          <ul className="mt-1.5 space-y-1">
            {past.map((loan) => (
              <li key={loan.id} className="text-[12.5px] text-muted">
                {loan.borrower_name} - {new Date(loan.date_loaned).toLocaleDateString()} to{' '}
                {loan.date_returned
                  ? new Date(loan.date_returned).toLocaleDateString()
                  : 'unknown'}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function MoveToShelvesButton({
  bookId,
  shelves,
}: {
  bookId: string
  shelves: NamedOption[]
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const { pending, error, run } = useAction()

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring rounded-[8px] bg-wax px-4 py-2 text-[13.5px] font-semibold text-eggshell hover:bg-wax-hover cursor-pointer"
      >
        Move to my shelves
      </button>
    )
  }

  return (
    <div className="rounded-[10px] border border-line bg-surface p-3.5">
      <p className="mb-2 text-[13px] font-semibold text-ink">
        Which shelves does it go on?
      </p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {shelves.map((shelf) => {
          const on = selected.includes(shelf.id)
          return (
            <button
              key={shelf.id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setSelected((s) =>
                  s.includes(shelf.id) ? s.filter((x) => x !== shelf.id) : [...s, shelf.id]
                )
              }
              className={`focus-ring rounded-full border px-2.5 py-1 text-[12.5px] cursor-pointer ${
                on ? 'border-wax bg-wax text-eggshell' : 'border-line text-muted hover:text-ink'
              }`}
            >
              {shelf.name}
            </button>
          )
        })}
      </div>
      <input
        className="field mb-2"
        placeholder="Or type a new shelf name"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
      />
      {error ? <p role="alert" className="mb-2 text-[12.5px] text-wax">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() =>
              moveToShelves(bookId, selected, newName.trim() ? [newName.trim()] : [])
            )
          }
          className="focus-ring rounded-[8px] bg-wax px-4 py-2 text-[13px] font-semibold text-eggshell hover:bg-wax-hover disabled:opacity-60 cursor-pointer"
        >
          {pending ? 'Moving...' : 'Move it'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="focus-ring rounded-[8px] border border-line-strong px-4 py-2 text-[13px] font-semibold text-ink hover:bg-sunk cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function DeleteBookButton({ bookId }: { bookId: string }) {
  const [confirming, setConfirming] = useState(false)
  const router = useRouter()
  const { pending, error, run } = useAction()

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="focus-ring rounded-[8px] px-3 py-2 text-[13px] text-subtle underline hover:text-wax cursor-pointer"
      >
        Remove from library
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-ink">Remove this book?</span>
      <button
        type="button"
        disabled={pending}
        // The action soft-deletes and revalidates; navigating away is the
        // client's job so a failure can surface here instead of mid-redirect.
        onClick={() => run(() => deleteBook(bookId), () => router.push('/library'))}
        className="focus-ring rounded-[8px] bg-wax px-3 py-1.5 text-[13px] font-semibold text-eggshell hover:bg-wax-hover disabled:opacity-60 cursor-pointer"
      >
        {pending ? 'Removing...' : 'Yes, remove'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="focus-ring rounded-[8px] border border-line-strong px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-sunk cursor-pointer"
      >
        Keep it
      </button>
      {error ? <span role="alert" className="text-[12.5px] text-wax">{error}</span> : null}
    </div>
  )
}
