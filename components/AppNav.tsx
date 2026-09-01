'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'

const LINKS = [
  { href: '/library', label: 'Library' },
  { href: '/shelves', label: 'Shelves' },
  { href: '/wishlist', label: 'Wishlist' },
  { href: '/series', label: 'Series' },
  { href: '/loans', label: 'Loans' },
]

export function AppNav() {
  const pathname = usePathname()
  const { signOut } = useClerk()

  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto"
      aria-label="Sections"
    >
      {LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`focus-ring shrink-0 rounded-[7px] px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              active
                ? 'bg-wax text-eggshell'
                : 'text-muted hover:text-ink hover:bg-sunk'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
      <button
        type="button"
        onClick={() => signOut({ redirectUrl: '/sign-in' })}
        className="focus-ring ml-auto shrink-0 rounded-[7px] px-3 py-1.5 text-[13px] text-subtle hover:text-ink cursor-pointer"
      >
        Sign out
      </button>
    </nav>
  )
}
