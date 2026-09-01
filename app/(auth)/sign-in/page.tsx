import { SignIn } from '@clerk/nextjs'

// Clerk's hosted component replaces the old hand-rolled form (which called
// Supabase Auth directly). The brand chrome — wax seal, wordmark, parchment
// card — lives in app/(auth)/layout.tsx and wraps this either way; only the
// form itself changes. Clerk's own header is hidden in favor of the same
// heading the hand-rolled page used, so the card reads identically either
// way. `appearance` here layers on top of the palette set globally in
// app/layout.tsx's <ClerkProvider>, to fit this card shell instead of
// Clerk's own boxed default.
export default function SignInPage() {
  return (
    <>
      <h1
        className="text-[28px] leading-tight text-center mb-6 text-wax"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Sign in
      </h1>

      <SignIn
        routing="hash"
        fallbackRedirectUrl="/library"
        appearance={{
          elements: {
            rootBox: 'w-full',
            cardBox: 'w-full shadow-none border-none',
            card: 'w-full p-0 bg-transparent gap-4',
            header: 'hidden',
            footer: 'mt-5 bg-transparent',
            footerAction: 'text-[13px] justify-center',
            footerActionText: 'text-[13px] text-muted',
            footerActionLink:
              'text-wax underline hover:text-wax-hover focus-visible:outline-2 focus-visible:outline-wax rounded',
            formButtonPrimary:
              'focus-ring rounded-[8px] py-2.5 text-[15px] font-semibold text-eggshell bg-wax hover:bg-wax-hover normal-case shadow-none',
            formFieldLabel: 'label',
            formFieldInput: 'field',
            formFieldInput__identifier: 'field',
            dividerLine: 'bg-line',
            dividerText: 'text-subtle text-[12px]',
            socialButtonsBlockButton:
              'border-line-strong text-ink hover:bg-sunk rounded-[8px]',
            identityPreviewEditButton: 'text-wax',
            formResendCodeLink: 'text-wax',
            otpCodeFieldInput: 'field',
          },
        }}
      />
    </>
  )
}
