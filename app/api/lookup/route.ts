import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { lookupByIsbn, searchVolumes } from '@/lib/googleBooks'
import { toIsbnPair, isValidIsbn, normalizeIsbn } from '@/lib/isbn'

// Google Books lookup, proxied so the API key stays server-side. Also reports
// whether the scanned ISBN is already in the caller's library, which is what
// drives the duplicate warning in the add flow.

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Route handlers are reachable directly, so this check is the real gate.
  if (!user) {
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
        findDuplicates(supabase, user.id, isbn10, isbn13),
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

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function findDuplicates(
  supabase: SupabaseClient,
  userId: string,
  isbn10: string | null,
  isbn13: string | null
) {
  const forms = [isbn10, isbn13].filter((v): v is string => Boolean(v))
  if (forms.length === 0) return []

  const orFilter = forms
    .flatMap((f) => [`isbn10.eq.${f}`, `isbn13.eq.${f}`])
    .join(',')

  const { data } = await supabase
    .from('book')
    .select('id, title, authors, cover_image_url, location, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .or(orFilter)

  return data ?? []
}
