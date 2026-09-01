import { NextResponse } from 'next/server'
import { getDb, type Sql } from '@/lib/db'
import { lookupByIsbn, searchVolumes } from '@/lib/googleBooks'
import { toIsbnPair, isValidIsbn, normalizeIsbn } from '@/lib/isbn'

// Google Books lookup, proxied so the API key stays server-side. Also reports
// whether the scanned ISBN is already in the caller's library, which is what
// drives the duplicate warning in the add flow.

export async function GET(request: Request) {
  // Route handlers are reachable directly, so this check is the real gate.
  // getDb() throws when there is no signed-in Clerk user.
  let sql: Sql
  let userId: string
  try {
    ;({ sql, userId } = await getDb())
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const isbnParam = searchParams.get('isbn')
  const queryParam = searchParams.get('q')

  try {
    if (isbnParam) {
      const isbn = normalizeIsbn(isbnParam)
      if (!isValidIsbn(isbn)) {
        return NextResponse.json(
          { error: 'That does not look like a valid ISBN.', candidates: [], duplicates: [] },
          { status: 422 }
        )
      }

      const { isbn10, isbn13 } = toIsbnPair(isbn)

      // Look up the edition and check for an existing copy in parallel — the
      // duplicate warning has to render at the same moment as the autofill.
      const [candidates, duplicates] = await Promise.all([
        lookupByIsbn(isbn),
        findDuplicates(sql, userId, isbn10, isbn13),
      ])

      return NextResponse.json({ candidates, duplicates })
    }

    if (queryParam) {
      const candidates = await searchVolumes(queryParam)
      return NextResponse.json({ candidates, duplicates: [] })
    }

    return NextResponse.json(
      { error: 'Provide an isbn or q parameter.' },
      { status: 400 }
    )
  } catch (err) {
    // A Google Books outage must not block manual entry, so this is reported
    // as a soft failure the add form can fall back from.
    console.error('Google Books lookup failed', err)

    // Without an API key, requests share one anonymous Google project whose
    // daily quota is routinely exhausted, so 429 is the common failure and
    // deserves an error that names the actual fix.
    const rateLimited = err instanceof Error && err.message.includes('429')

    return NextResponse.json(
      {
        error: rateLimited
          ? 'Google Books is rate limiting lookups. Set GOOGLE_BOOKS_API_KEY to get your own quota. You can still enter details manually.'
          : 'Lookup is unavailable right now. You can still enter details manually.',
        candidates: [],
        duplicates: [],
      },
      { status: 502 }
    )
  }
}

async function findDuplicates(
  sql: Sql,
  userId: string,
  isbn10: string | null,
  isbn13: string | null
) {
  const forms = [isbn10, isbn13].filter((v): v is string => Boolean(v))
  if (forms.length === 0) return []

  // A book counts as a duplicate if either ISBN form on the scanned edition
  // matches either ISBN form already on record — mirrors the original
  // PostgREST `.or('isbn10.eq.a,isbn13.eq.a,isbn10.eq.b,isbn13.eq.b')`.
  const rows = await sql`
    select id, title, authors, cover_image_url, location, created_at
    from book
    where user_id = ${userId}
      and deleted_at is null
      and (isbn10 = any(${forms}::text[]) or isbn13 = any(${forms}::text[]))
  `

  return rows
}
