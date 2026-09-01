import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

export type Sql = NeonQueryFunction<false, false>

/**
 * A Postgres connection authenticated as the current Clerk user, via Neon
 * RLS ("Authorize"). The connection carries the user's Clerk session JWT on
 * every query, using the `authenticated` Postgres role that Neon provisions
 * for this — so `auth.user_id()` in db/001_schema.sql's RLS policies
 * resolves to this user for as long as this `sql` function is used.
 * Ownership is enforced by Postgres, not by this helper: every query still
 * gets scoped with an explicit `where user_id = ...` at the call site (belt
 * and braces, and it keeps intent readable), exactly as the Supabase-backed
 * version of this app did.
 *
 * Throws if there is no signed-in Clerk user — callers that need to run
 * unauthenticated (there currently are none) should call `auth()` directly
 * instead of going through this helper.
 */
export async function getDb(): Promise<{ sql: Sql; userId: string }> {
  const { userId, getToken } = await auth()
  if (!userId) throw new Error('You must be signed in to do that.')

  const token = await getToken()
  if (!token) throw new Error('You must be signed in to do that.')

  const sql = neon(process.env.DATABASE_AUTHENTICATED_URL!, {
    authToken: token,
  })

  return { sql, userId }
}

/**
 * Same as getDb(), but resolves to null instead of throwing when there is no
 * signed-in Clerk user. lib/books.ts's read helpers use this to preserve
 * their original Supabase-era behavior of quietly returning an empty
 * result for a logged-out caller, rather than surfacing an error — those
 * reads are only ever invoked from behind app/(app)/layout.tsx's redirect
 * gate anyway, so this is a defensive fallback, not the primary check.
 */
export async function tryGetDb(): Promise<{ sql: Sql; userId: string } | null> {
  try {
    return await getDb()
  } catch {
    return null
  }
}

/**
 * Ensures a `profile` row exists for the given (already-authenticated) Clerk
 * user id. Replaces the Supabase-era `handle_new_user()` trigger, which
 * fired `after insert on auth.users` — there is no such table under Neon,
 * since Clerk owns the user lifecycle outside this database. This runs
 * before any query that assumes the row exists (the app layout's auth gate,
 * and every server action via requireUser()); `on conflict do nothing` makes
 * repeating it on every request cheap and safe.
 */
export async function ensureProfile(sql: Sql, userId: string): Promise<void> {
  await sql`
    insert into profile (id)
    values (${userId})
    on conflict (id) do nothing
  `
}
