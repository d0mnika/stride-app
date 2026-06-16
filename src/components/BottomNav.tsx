import Link from 'next/link'
import { Home, BookOpen, TimerIcon, CalendarDays, Zap } from 'lucide-react'

const TABS = [
  { href: '/dashboard', label: 'Home',     icon: Home        },
  { href: '/materials', label: 'Study',    icon: BookOpen    },
  { href: '/calendar',  label: 'Calendar', icon: CalendarDays },
  { href: '/timer',     label: 'Timer',    icon: TimerIcon   },
  { href: '/focus',     label: 'Focus',    icon: Zap         },
] as const

interface Props {
  current: string
}

export default function BottomNav({ current }: Props) {
  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F5F1EB]/97 backdrop-blur-md border-t border-[#EDEAE3] rounded-t-2xl shadow-[0_-4px_20px_rgba(163,143,134,0.1)]"
      style={{ paddingBottom: '8px' }}
    >
      <div className="flex items-center justify-around h-16">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === current
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                active ? 'text-[#C8A7A1]' : 'text-[#B8A8A2] active:text-[#3D2B26]'
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2 : 1.6} />
              <span className="text-[9px] uppercase tracking-wider font-semibold">
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
