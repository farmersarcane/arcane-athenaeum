import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { WaxSeal, InkFlourish } from '@/components/Ornaments'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/library')

  return (
    <div className="parchment-tooth flex min-h-screen flex-col items-center justify-center px-5 py-16 text-center">
      <span className="text-wax">
        <WaxSeal size={64} label="Arcane Athenaeum" />
      </span>

      <h1
        className="mt-5 text-[30px] leading-tight tracking-[0.11em] text-wax sm:text-[38px]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        ARCANE ATHENAEUM
      </h1>

      <p
        className="mt-3 max-w-[440px] text-[19px] leading-snug text-muted"
        style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
      >
        Every book you own, and every book you want.
      </p>

      <InkFlourish className="my-7 w-full max-w-[300px]" />

      <p
        className="max-w-[460px] text-[15px] leading-relaxed text-ink"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Catalog your shelves by scanning a barcode, track what you have read and
        what you have lent out, and keep a wishlist for everything you find in
        the wild.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/sign-in"
          className="focus-ring rounded-[8px] bg-wax px-5 py-2.5 text-[15px] font-semibold text-eggshell hover:bg-wax-hover"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="focus-ring rounded-[8px] border border-line-strong px-5 py-2.5 text-[15px] font-semibold text-ink hover:bg-sunk"
        >
          Create a library
        </Link>
      </div>
    </div>
  )
}
