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

const tabs = [
  { to: '/', icon: CheckSquare, label: 'Check-in' },
  { to: '/desk', icon: LayoutDashboard, label: 'Home' },
  { to: '/datebook', icon: CalendarDays, label: 'Calendar' },
  { to: '/todos', icon: ListTodo, label: 'Tasks' },
  { to: '/food', icon: Utensils, label: 'Food' },
  { to: '/workout', icon: Dumbbell, label: 'Workout' },
  { to: '/outbound', icon: Phone, label: 'Outreach' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/body', icon: Activity, label: 'Body' },
  { to: '/finance', icon: DollarSign, label: 'Finance' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
  { to: '/command', icon: Terminal, label: 'Command' },
]

export default function Nav({ onOpenOperator }) {
  const pathname = usePathname()

  return (
    <nav
      className="flex h-[100dvh] max-h-[100dvh] w-[56px] shrink-0 flex-col border-r border-[rgba(220,60,80,0.08)] bg-[#0a0607] md:w-[196px]"
      aria-label="Main"
    >
      <div className="flex h-11 shrink-0 items-center border-b border-[rgba(220,60,80,0.08)] px-2 md:px-3.5">
        <span className="hidden truncate text-[15px] font-semibold tracking-tight text-[#f5f0f0] md:block">
          FORGE
        </span>
        <span className="flex w-full justify-center text-[10px] font-semibold tabular-nums text-[rgba(255,255,255,0.28)] md:hidden forge-mono">
          F
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2 [scrollbar-width:thin]">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/' ? pathname === '/' : pathname === to
          return (
            <Link
              key={to}
              href={to}
              title={label}
              className={`mx-1 flex items-center gap-2.5 rounded-[6px] border-l-[2px] py-2 pl-[7px] pr-2 text-[13px] font-normal leading-tight outline-none transition-colors duration-150 ease-out md:pr-2.5 ${
                isActive
                  ? 'border-realm-gold bg-[rgba(220,60,80,0.08)] text-[#f5f0f0]'
                  : 'border-transparent text-[rgba(255,255,255,0.32)] hover:bg-realm-panel hover:text-[rgba(255,255,255,0.75)]'
              }`}
            >
              <Icon size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
              <span className="hidden min-w-0 flex-1 truncate md:inline">{label}</span>
            </Link>
          )
        })}
      </div>
      {typeof onOpenOperator === 'function' && (
        <div className="mt-auto shrink-0 border-t border-[rgba(220,60,80,0.08)] p-1.5">
          <button
            type="button"
            onClick={onOpenOperator}
            className="mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2.5 rounded-[6px] border-l-[2px] border-transparent py-2 pl-[7px] pr-2 text-left text-[13px] text-[rgba(255,255,255,0.32)] transition-colors duration-150 ease-out hover:bg-[rgba(220,60,80,0.08)] hover:text-realm-gold md:pr-2.5"
            title="Operator"
          >
            <MessageCircle size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
            <span className="hidden min-w-0 flex-1 truncate md:inline">Operator</span>
          </button>
        </div>
      )}
    </nav>
  )
}
