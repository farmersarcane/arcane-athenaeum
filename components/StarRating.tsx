'use client'

import { useState } from 'react'

// Whole stars only, per the v1 decision. Half stars are on the v2 backlog.

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z"
        fill={filled ? 'var(--color-clay)' : 'none'}
        stroke={filled ? 'var(--color-clay)' : 'var(--color-line-strong)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function StaticRating({
  rating,
  size = 16,
}: {
  rating: number | null
  size?: number
}) {
  if (!rating) return null
  return (
    <span
      className="inline-flex items-center gap-[2px]"
      role="img"
      aria-label={`Rated ${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= rating} size={size} />
      ))}
    </span>
  )
}

export function RatingInput({
  value,
  onChange,
  size = 28,
}: {
  value: number | null
  onChange: (rating: number | null) => void
  size?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value ?? 0

  return (
    <div className="flex items-center gap-2">
      {/* A radiogroup rather than five toggles: the stars are one choice, and
          arrow keys should move between them the way a rating widget should. */}
      <div
        className="flex items-center gap-1"
        role="radiogroup"
        aria-label="Rating"
        onMouseLeave={() => setHover(null)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            className="focus-ring rounded p-[2px] cursor-pointer"
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            // Clicking the current rating again clears it, which is the only
            // way back to "not yet rated" without a separate control.
            onClick={() => onChange(value === n ? null : n)}
          >
            <Star filled={n <= shown} size={size} />
          </button>
        ))}
      </div>
      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[13px] underline cursor-pointer text-muted hover:text-ink"
        >
          Clear
        </button>
      ) : null}
    </div>
  )
}
