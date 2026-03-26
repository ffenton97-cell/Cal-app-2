'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CheckSquare,
  LayoutDashboard,
  CalendarDays,
  ListTodo,
  Utensils,
  Dumbbell,
  Phone,
  Target,
  Activity,
  DollarSign,
  BookOpen,
  Terminal,
  History,
  BarChart3,
  MessageCircle,
} from 'lucide-react'

function ForgeMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="nm-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e05070"/>
          <stop offset="1" stopColor="#7b1535"/>
        </linearGradient>
        <linearGradient id="nm-shine" x1="0" y1="0" x2="0" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.20"/>
          <stop offset="1" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7.5" fill="url(#nm-bg)"/>
      <rect width="32" height="16" rx="7.5" fill="url(#nm-shine)"/>
      <rect x="9" y="8" width="3.5" height="16" rx="1.5" fill="white"/>
      <rect x="9" y="8" width="13.5" height="3.5" rx="1.5" fill="white"/>
      <rect x="9" y="14.5" width="9.5" height="3" rx="1.5" fill="white"/>
      <circle cx="22.5" cy="9.5" r="1.8" fill="white" fillOpacity="0.30"/>
    </svg>
  )
}

const tabs = [
  { to: '/',        icon: CheckSquare,    label: 'Check-in'  },
  { to: '/desk',    icon: LayoutDashboard, label: 'Home'     },
  { to: '/datebook',icon: CalendarDays,   label: 'Calendar'  },
  { to: '/todos',   icon: ListTodo,       label: 'Tasks'     },
  { to: '/food',    icon: Utensils,       label: 'Food'      },
  { to: '/workout', icon: Dumbbell,       label: 'Workout'   },
  { to: '/outbound',icon: Phone,          label: 'Outreach'  },
  { to: '/goals',   icon: Target,         label: 'Goals'     },
  { to: '/body',    icon: Activity,       label: 'Body'      },
  { to: '/finance', icon: DollarSign,     label: 'Finance'   },
  { to: '/journal', icon: BookOpen,       label: 'Journal'   },
  { to: '/history', icon: History,        label: 'History'   },
  { to: '/stats',   icon: BarChart3,      label: 'Stats'     },
  { to: '/command', icon: Terminal,       label: 'Command'   },
]

export default function Nav({ onOpenOperator }) {
  const pathname = usePathname()

  return (
    <nav
      className="glass-nav flex h-[100dvh] max-h-[100dvh] w-[56px] shrink-0 flex-col md:w-[196px]"
      aria-label="Main"
    >
      {/* Logo header */}
      <div className="flex h-[54px] shrink-0 items-center gap-2.5 border-b border-white/[0.07] px-2 md:px-3.5">
        <ForgeMark size={20} />
        <span className="hidden truncate text-[14px] font-semibold tracking-[0.04em] text-white/88 md:block select-none">
          FORGE
        </span>
      </div>

      {/* Nav items */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2 [scrollbar-width:thin]">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/' ? pathname === '/' : pathname === to
          return (
            <Link
              key={to}
              href={to}
              title={label}
              className={`mx-1.5 my-0.5 flex items-center gap-2.5 rounded-[8px] py-2 pl-2 pr-2 text-[13px] font-normal leading-tight outline-none transition-all duration-150 ease-out md:pr-2.5 ${
                isActive
                  ? 'bg-realm-gold/[0.13] text-white border border-realm-gold/[0.18]'
                  : 'text-white/40 hover:bg-white/[0.06] hover:text-white/72 border border-transparent'
              }`}
            >
              <Icon
                size={17}
                strokeWidth={isActive ? 2 : 1.5}
                className={`shrink-0 ${isActive ? 'text-realm-gold' : ''}`}
                aria-hidden
              />
              <span className="hidden min-w-0 flex-1 truncate md:inline">{label}</span>
            </Link>
          )
        })}
      </div>

      {/* Operator button */}
      {typeof onOpenOperator === 'function' && (
        <div className="mt-auto shrink-0 border-t border-white/[0.07] p-1.5">
          <button
            type="button"
            onClick={onOpenOperator}
            className="mx-1.5 flex w-[calc(100%-0.75rem)] items-center gap-2.5 rounded-[8px] border border-transparent py-2 pl-2 pr-2 text-left text-[13px] text-white/38 transition-all duration-150 ease-out hover:bg-white/[0.06] hover:text-white/68 md:pr-2.5"
            title="Operator"
          >
            <MessageCircle size={17} strokeWidth={1.5} className="shrink-0" aria-hidden />
            <span className="hidden min-w-0 flex-1 truncate md:inline">Operator</span>
          </button>
        </div>
      )}
    </nav>
  )
}
