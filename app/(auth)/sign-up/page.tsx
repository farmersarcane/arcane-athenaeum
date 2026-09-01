'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // With email confirmation on, Supabase returns a user but no session.
    if (data.session) {
      router.push('/library')
      router.refresh()
      return
    }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center">
        <h1
          className="text-[24px] mb-3 text-wax"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Check your email
        </h1>
        <p className="text-[14px] text-muted">
          We sent a confirmation link to <strong className="text-ink">{email}</strong>.
          Open it to finish setting up your library.
        </p>
      </div>
    )
  }

  return (
    <>
      <h1
        className="text-[28px] leading-tight text-center mb-6 text-wax"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Create your library
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
            minLength={8}
            autoComplete="new-password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
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
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-[13px] text-muted">
        Already have one?{' '}
        <Link href="/sign-in" className="underline text-wax focus-ring rounded">
          Sign in
        </Link>
      </p>
    </>
  )
}
