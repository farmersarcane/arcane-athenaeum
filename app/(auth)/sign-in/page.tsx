'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/library')
    // The app layout reads the session on the server, so the router cache has
    // to be refreshed or the redirect can land back on a logged-out shell.
    router.refresh()
  }

  return (
    <>
      <h1
        className="text-[28px] leading-tight text-center mb-6 text-wax"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Sign in
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
          />
        </div>

        {error ? (
          <p role="alert" className="text-[13px] text-wax">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="focus-ring w-full rounded-[8px] py-2.5 text-[15px] font-semibold text-eggshell bg-wax hover:bg-wax-hover disabled:opacity-60 cursor-pointer"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-5 text-center text-[13px] text-muted">
        No account yet?{' '}
        <Link href="/sign-up" className="underline text-wax focus-ring rounded">
          Create one
        </Link>
      </p>
    </>
  )
}
