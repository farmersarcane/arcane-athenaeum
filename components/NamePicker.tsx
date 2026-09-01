'use client'

import { useState } from 'react'

export type NamedOption = { id: string; name: string }

/**
 * Pick any number of existing shelves/tags, or type a new name to create one
 * inline. New names are returned separately from existing ids so the server
 * action can find-or-create them in a single pass.
 */
export function NamePicker({
  label,
  options,
  selectedIds,
  newNames,
  onChangeSelected,
  onChangeNew,
  placeholder,
}: {
  label: string
  options: NamedOption[]
  selectedIds: string[]
  newNames: string[]
  onChangeSelected: (ids: string[]) => void
  onChangeNew: (names: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  function toggle(id: string) {
    onChangeSelected(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    )
  }

  function addDraft() {
    const clean = draft.trim()
    if (!clean) return

    // Typing the name of something that already exists selects it rather than
    // creating a duplicate the database would reject anyway.
    const existing = options.find(
      (o) => o.name.toLowerCase() === clean.toLowerCase()
    )
    if (existing) {
      if (!selectedIds.includes(existing.id)) onChangeSelected([...selectedIds, existing.id])
    } else if (!newNames.some((n) => n.toLowerCase() === clean.toLowerCase())) {
      onChangeNew([...newNames, clean])
    }
    setDraft('')
  }

  return (
    <div>
      <span className="label">{label}</span>

      {options.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {options.map((option) => {
            const on = selectedIds.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(option.id)}
                className={`focus-ring rounded-full border px-2.5 py-1 text-[12.5px] cursor-pointer transition-colors ${
                  on
                    ? 'border-wax bg-wax text-eggshell'
                    : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                {option.name}
              </button>
            )
          })}
        </div>
      ) : null}

      {newNames.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {newNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-clay bg-clay/10 px-2.5 py-1 text-[12.5px] text-ink"
            >
              {name}
              <span className="text-[10px] uppercase tracking-wide text-clay">new</span>
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => onChangeNew(newNames.filter((n) => n !== name))}
                className="focus-ring rounded cursor-pointer text-muted hover:text-ink"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          type="text"
          className="field"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds the name without submitting the surrounding form.
            if (e.key === 'Enter') {
              e.preventDefault()
              addDraft()
            }
          }}
        />
        <button
          type="button"
          onClick={addDraft}
          className="focus-ring shrink-0 rounded-[8px] border border-line-strong px-3 text-[13px] font-semibold text-ink hover:bg-sunk cursor-pointer"
        >
          Add
        </button>
      </div>
    </div>
  )
}
