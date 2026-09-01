import Link from 'next/link'
import { WaxSeal } from '@/components/Ornaments'

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="parchment-tooth min-h-screen flex flex-col items-center justify-center px-5 py-12">
      <Link href="/" className="focus-ring rounded flex flex-col items-center gap-3 mb-8">
        <span className="text-wax">
          <WaxSeal size={52} label="Arcane Athenaeum" />
        </span>
        <span
          className="text-[19px] tracking-[0.14em] text-wax"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          ARCANE ATHENAEUM
        </span>
      </Link>

      <div className="w-full max-w-[400px] rounded-[10px] border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(42,33,24,0.06),0_4px_12px_rgba(42,33,24,0.05)]">
        {children}
      </div>
    </div>
  )
}
