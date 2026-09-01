import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { ensureProfile, getDb } from '@/lib/db'
import { AppNav } from '@/components/AppNav'
import { WaxSeal } from '@/components/Ornaments'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const { userId } = await auth()

  // The real authorization gate. The proxy only makes Clerk's auth context
  // available to the request; it does not decide who gets in.
  if (!userId) redirect('/sign-in')

  // First authenticated request of a session (often the first ever, for a
  // brand-new signup) is exactly when the profile row needs to exist —
  // replaces the Supabase `handle_new_user()` trigger. See lib/db.ts.
  const { sql } = await getDb()
  await ensureProfile(sql, userId)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 py-3">
            <Link
              href="/library"
              className="focus-ring flex items-center gap-2.5 rounded"
            >
              <span className="text-wax">
                <WaxSeal size={28} label="Arcane Athenaeum" />
              </span>
              <span
                className="hidden text-[15px] tracking-[0.13em] text-wax sm:block"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                ARCANE ATHENAEUM
              </span>
            </Link>

            <Link
              href="/add"
              className="focus-ring shrink-0 rounded-[8px] bg-wax px-3.5 py-2 text-[13px] font-semibold text-eggshell hover:bg-wax-hover"
            >
              + Add book
            </Link>
          </div>

          <div className="pb-2">
            <AppNav />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
