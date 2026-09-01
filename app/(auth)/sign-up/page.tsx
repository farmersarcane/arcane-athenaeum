import { SignUp } from '@clerk/nextjs'

// See app/(auth)/sign-in/page.tsx for why this is a themed Clerk component
// rather than the old hand-rolled form. Clerk handles email verification
// (the old "check your email" step) inside its own flow, so the app no
// longer needs a matching /auth/callback route — Clerk owns that redirect.
export default function SignUpPage() {
  return (
    <>
      <h1
        className="text-[28px] leading-tight text-center mb-6 text-wax"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Create your library
      </h1>

      <SignUp
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
