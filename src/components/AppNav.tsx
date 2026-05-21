import Link from 'next/link'
import { User, Settings } from 'lucide-react'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/materials', label: 'Materials' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/timer', label: 'Timer' },
  { href: '/focus', label: 'Focus' },
  { href: '/settings', label: 'Settings' },
] as const

interface Props {
  current: string
  userInitial?: string
}

export default function AppNav({ current, userInitial }: Props) {
  return (
    <nav className="sticky top-0 z-30 w-full bg-[#F5F1EB]/95 backdrop-blur-sm border-b border-[#EDEAE3] shadow-[0_1px_6px_rgba(163,143,134,0.1)]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="font-palatino text-[22px] font-bold text-[#3D2B26] tracking-tight shrink-0 hover:text-[#5C4A45] transition"
        >
          Stride
        </Link>

        {/* Nav links — hidden on mobile (bottom nav used instead) */}
        <div className="hidden sm:flex items-center gap-0.5 text-xs font-medium tracking-wide overflow-x-auto no-scrollbar">
          {LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg uppercase tracking-wider whitespace-nowrap transition ${
                l.href === current
                  ? 'text-[#C8A7A1] pointer-events-none'
                  : 'text-[#8C7B75] hover:text-[#3D2B26] hover:bg-[#EDEAE3]'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side: Settings (mobile only) + Account */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/settings"
            className={`sm:hidden p-2 rounded-lg border border-[#D2C4B5] bg-[#FAF9F7] hover:border-[#A38F86] hover:bg-[#F0ECE6] transition shadow-[0_2px_6px_rgba(163,143,134,0.12)] ${current === '/settings' ? 'text-[#C8A7A1]' : 'text-[#5C4A45]'}`}
          >
            <Settings size={15} />
          </Link>
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-full border border-[#D2C4B5] bg-[#FAF9F7] px-3.5 py-1.5 text-xs font-medium text-[#5C4A45] hover:border-[#A38F86] hover:bg-[#F0ECE6] transition shadow-[0_2px_6px_rgba(163,143,134,0.12)]"
          >
            {userInitial ? (
              <span className="w-5 h-5 rounded-full bg-[#C8A7A1] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                {userInitial}
              </span>
            ) : (
              <User size={12} className="shrink-0" />
            )}
            <span>Account</span>
          </Link>
        </div>

      </div>
    </nav>
  )
}
