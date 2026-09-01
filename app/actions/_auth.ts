import 'server-only'
import { getDb, ensureProfile } from '@/lib/db'

/**
 * Server Actions are reachable by direct POST, not just through the UI, so
 * every action calls this before touching data. Throwing here surfaces as a
 * rejected action rather than a silent no-op.
 */
export async function requireUser() {
  const { sql, userId } = await getDb()
  await ensureProfile(sql, userId)
  return { sql, user: { id: userId } }
}
