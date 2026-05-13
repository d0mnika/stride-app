import Link from 'next/link'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/materials', label: 'Materials' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/timer', label: 'Timer' },
  { href: '/focus', label: 'Focus' },
  { href: '/settings', label: 'Settings' },
] as const

export default function Nav({ current }: { current: string }) {
  return (
    <nav className="flex items-center gap-4 text-sm text-[#A38F86]">
      {LINKS.map(l => (
        <Link
          key={l.href}
          href={l.href}
          className={l.href === current
            ? 'text-[#C8A7A1] cursor-default pointer-events-none font-medium'
            : 'hover:text-[#3D2B26] transition'}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
