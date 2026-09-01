import 'server-only'
import { createClient } from '@/lib/supabase-server'

/**
 * Server Actions are reachable by direct POST, not just through the UI, so
 * every action calls this before touching data. Throwing here surfaces as a
 * rejected action rather than a silent no-op.
 */
export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to do that.')
  return { supabase, user }
}
