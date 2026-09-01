// ISBN normalization. Google Books is inconsistent about which form it indexes
// a given edition under, so every lookup tries both forms and every book row
// stores both when they can be derived.

/** Strip hyphens, spaces, and other separators. Uppercases a trailing X. */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase()
}

function isbn10CheckDigit(first9: string): string {
  let sum = 0
  for (let i = 0; i < 9; i++) sum += (i + 1) * Number(first9[i])
  const check = sum % 11
  return check === 10 ? 'X' : String(check)
}

function isbn13CheckDigit(first12: string): string {
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3)
  return String((10 - (sum % 10)) % 10)
}

export function isValidIsbn10(value: string): boolean {
  const isbn = normalizeIsbn(value)
  if (!/^\d{9}[\dX]$/.test(isbn)) return false
  return isbn10CheckDigit(isbn.slice(0, 9)) === isbn[9]
}

export function isValidIsbn13(value: string): boolean {
  const isbn = normalizeIsbn(value)
  if (!/^\d{13}$/.test(isbn)) return false
  return isbn13CheckDigit(isbn.slice(0, 12)) === isbn[12]
}

export function isValidIsbn(value: string): boolean {
  return isValidIsbn10(value) || isValidIsbn13(value)
}

/** ISBN-10 to ISBN-13. Returns null if the input is not a valid ISBN-10. */
export function isbn10To13(value: string): string | null {
  const isbn = normalizeIsbn(value)
  if (!isValidIsbn10(isbn)) return null
  const body = '978' + isbn.slice(0, 9)
  return body + isbn13CheckDigit(body)
}

/**
 * ISBN-13 to ISBN-10. Only 978-prefixed ISBN-13s have a 10-digit equivalent;
 * 979-prefixed ones (increasingly common on new titles) do not, and return null.
 */
export function isbn13To10(value: string): string | null {
  const isbn = normalizeIsbn(value)
  if (!isValidIsbn13(isbn) || !isbn.startsWith('978')) return null
  const body = isbn.slice(3, 12)
  return body + isbn10CheckDigit(body)
}

export type IsbnPair = { isbn10: string | null; isbn13: string | null }

/**
 * Expand whatever form was scanned or typed into both forms where possible.
 * Both fields are null when the input is not a valid ISBN.
 */
export function toIsbnPair(value: string): IsbnPair {
  const isbn = normalizeIsbn(value)
  if (isValidIsbn13(isbn)) return { isbn10: isbn13To10(isbn), isbn13: isbn }
  if (isValidIsbn10(isbn)) return { isbn10: isbn, isbn13: isbn10To13(isbn) }
  return { isbn10: null, isbn13: null }
}

/** Hyphenate an ISBN-13 for display. Group boundaries are approximate: the
 *  registrant-group split varies by publisher and is not worth a lookup table
 *  for a display-only nicety. */
export function formatIsbn(value: string | null | undefined): string {
  if (!value) return ''
  const isbn = normalizeIsbn(value)
  if (isbn.length === 13) {
    return `${isbn.slice(0, 3)}-${isbn.slice(3, 4)}-${isbn.slice(4, 8)}-${isbn.slice(8, 12)}-${isbn.slice(12)}`
  }
  if (isbn.length === 10) {
    return `${isbn.slice(0, 1)}-${isbn.slice(1, 5)}-${isbn.slice(5, 9)}-${isbn.slice(9)}`
  }
  return isbn
}
