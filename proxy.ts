import { clerkMiddleware } from '@clerk/nextjs/server'

// Next 16 renamed Middleware to Proxy; the file must sit at the project root
// alongside `app`. Its only job here is making Clerk's auth context available
// to every request (server components, server actions, route handlers all
// call auth() downstream), which requires this to wrap the whole app. It does
// NOT protect routes — Clerk's own guidance is that middleware/proxy is not
// the place for that ("protect as close to the resource as possible"), which
// matches how this app already worked under Supabase: the real gate is in
// app/(app)/layout.tsx, and every server action re-checks the session via
// requireUser(), because both are reachable by a direct request that a proxy
// check alone would only optimistically redirect, not actually authorize.
export default clerkMiddleware()

export const config = {
  matcher: [
    // Everything except static assets and image files.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
