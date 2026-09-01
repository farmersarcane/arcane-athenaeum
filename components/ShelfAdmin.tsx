'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createShelf } from '@/app/actions/organization'

export function ShelfAdmin() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function add() {
    const clean = name.trim()
    if (!clean) return
    setError(null)
    startTransition(async () => {
      try {
        await createShelf(clean)
        setName('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That shelf could not be created.')
      }
    })
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
        className="flex gap-2"
      >
        <input
          className="field max-w-[320px]"
          aria-label="New shelf name"
          placeholder="New shelf, e.g. Home Repair"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={pending}
          className="focus-ring shrink-0 rounded-[8px] bg-wax px-4 py-2 text-[13.5px] font-semibold text-eggshell hover:bg-wax-hover disabled:opacity-60 cursor-pointer"
        >
          {pending ? 'Creating...' : 'Create shelf'}
        </button>
      </form>
      {error ? <p role="alert" className="mt-2 text-[13px] text-wax">{error}</p> : null}
    </div>
  )
}
