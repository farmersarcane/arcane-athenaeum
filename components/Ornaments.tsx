// Makers Arcane decorative motifs. Used as accents at key moments — detail
// pages, empty states, primary actions — never inside the library grid, which
// stays plain so it remains scannable at a glance.

/** The signature wax-seal shape, used behind primary actions and as a mark. */
export function WaxSeal({
  size = 44,
  label,
}: {
  size?: number
  label?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      {/* Irregular edge — a poured blob, not a circle. */}
      <path
        d="M24 2.5c4.3-.6 7.9 2.2 11.6 3.6 3.9 1.5 8 2.2 9.6 5.9 1.6 3.6-.7 7.6-.6 11.6.1 4-2 8.2-4.5 11-2.6 2.9-6.7 3.4-10.3 4.9-3.6 1.5-7 4.3-10.8 3.8-3.8-.5-6.7-3.9-9.7-6.3-3-2.4-6.4-4.4-7.7-8-1.3-3.5.3-7.4.4-11.3.1-3.9-1.1-8.1 1-11.2 2.1-3.1 6.4-3.3 10-4.6C16.6 4.6 20 3 24 2.5Z"
        fill="currentColor"
      />
      {/* Impressed monogram: a stylized open book. */}
      <g opacity="0.42" fill="none" stroke="#FDFAE2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 17.5c-2.6-2-5.6-2.7-9-2.4v14c3.4-.3 6.4.4 9 2.4" />
        <path d="M24 17.5c2.6-2 5.6-2.7 9-2.4v14c-3.4-.3-6.4.4-9 2.4" />
        <path d="M24 17.5v14" />
      </g>
      {label ? <title>{label}</title> : null}
    </svg>
  )
}

/**
 * "Ex libris" bookplate stamp for the book detail page. Bears the Arcane
 * Athenaeum name, in the manner of a plate pasted inside a front cover.
 */
export function Bookplate({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 120"
      className={className}
      role="img"
      aria-label="Ex Libris Arcane Athenaeum bookplate"
    >
      <rect
        x="4"
        y="4"
        width="212"
        height="112"
        rx="4"
        fill="none"
        stroke="var(--color-line-strong)"
        strokeWidth="1.4"
      />
      <rect
        x="10"
        y="10"
        width="200"
        height="100"
        rx="2"
        fill="none"
        stroke="var(--color-line-strong)"
        strokeWidth="0.7"
      />
      <text
        x="110"
        y="42"
        textAnchor="middle"
        fill="var(--color-muted)"
        style={{ font: 'italic 400 17px var(--font-accent)' }}
      >
        Ex Libris
      </text>
      <line x1="52" y1="54" x2="168" y2="54" stroke="var(--color-line)" strokeWidth="1" />
      <text
        x="110"
        y="76"
        textAnchor="middle"
        fill="var(--color-wax)"
        style={{ font: '600 14px var(--font-display)', letterSpacing: '0.11em' }}
      >
        ARCANE
      </text>
      <text
        x="110"
        y="95"
        textAnchor="middle"
        fill="var(--color-wax)"
        style={{ font: '600 14px var(--font-display)', letterSpacing: '0.11em' }}
      >
        ATHENAEUM
      </text>
    </svg>
  )
}

/** A small pressed-flourish rule for section breaks on detail pages. */
export function InkFlourish({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <hr className="ink-rule flex-1" />
      <svg width="26" height="10" viewBox="0 0 26 10" className="shrink-0">
        <path
          d="M1 5h7M18 5h7M13 1.5 16 5l-3 3.5L10 5Z"
          fill="none"
          stroke="var(--color-line-strong)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <hr className="ink-rule flex-1" />
    </div>
  )
}
