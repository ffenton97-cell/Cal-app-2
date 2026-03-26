'use client'

import { useState, useMemo } from 'react'
import { Cloud, Zap, Flame } from 'lucide-react'
import { useXP } from '../hooks/useXP'
import { useStreaks } from '../hooks/useStreaks'
import SyncPanel from './SyncPanel'
import { getSyncToken } from '../lib/dexieSnapshot.js'

function ForgeMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="fm-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e05070"/>
          <stop offset="1" stopColor="#7b1535"/>
        </linearGradient>
        <linearGradient id="fm-shine" x1="0" y1="0" x2="0" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.22"/>
          <stop offset="1" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7.5" fill="url(#fm-bg)"/>
      <rect width="32" height="16" rx="7.5" fill="url(#fm-shine)"/>
      <rect x="9" y="8" width="3.5" height="16" rx="1.5" fill="white"/>
      <rect x="9" y="8" width="13.5" height="3.5" rx="1.5" fill="white"/>
      <rect x="9" y="14.5" width="9.5" height="3" rx="1.5" fill="white"/>
      <circle cx="22.5" cy="9.5" r="1.8" fill="white" fillOpacity="0.32"/>
    </svg>
  )
}

export default function Header() {
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncRev, setSyncRev] = useState(0)
  const { earnedToday, levelInfo } = useXP()
  const { checkInStreak } = useStreaks()
  const syncOn = useMemo(() => getSyncToken().length >= 8, [syncRev])

  const { current, next, progress, xpIntoLevel, xpForNext } = levelInfo ?? {
    current: { level: 1, title: 'Starter' },
    next: { xpRequired: 100 },
    progress: 0,
    xpIntoLevel: 0,
    xpForNext: 100,
  }

  return (
    <header className="glass-header fl-header-safe shrink-0">

      {/* ── Main bar ─────────────────────────────────────────────────────── */}
      <div className="flex h-[54px] items-center justify-between gap-3 px-4">

        {/* Logo mark + wordmark */}
        <div className="flex items-center gap-2.5">
          <ForgeMark size={26} />
          <span className="text-[15px] font-semibold tracking-[0.04em] text-white/90 select-none">
            FORGE
          </span>
        </div>

        {/* Right: stat chips + sync */}
        <div className="flex items-center gap-1.5">

          {checkInStreak > 0 && (
            <div className="glass-chip flex items-center gap-1.5 px-2.5 py-1">
              <Flame size={11} strokeWidth={2} className="text-realm-gold shrink-0" />
              <span className="forge-mono text-[11px] text-white/72 tabular-nums leading-none">
                {checkInStreak}
              </span>
            </div>
          )}

          {earnedToday > 0 && (
            <div className="glass-chip flex items-center gap-1.5 px-2.5 py-1">
              <Zap size={11} strokeWidth={2} className="text-realm-gold shrink-0" />
              <span className="forge-mono text-[11px] text-realm-gold tabular-nums leading-none">
                +{earnedToday}
              </span>
            </div>
          )}

          <div className="glass-chip flex items-center px-2.5 py-1">
            <span className="forge-mono text-[11px] text-white/45 leading-none select-none">
              Lv{current.level}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSyncOpen(true)}
            className="glass-icon-btn"
            aria-label="Sync settings"
            title="Sync"
          >
            <Cloud
              size={15}
              strokeWidth={1.6}
              className={syncOn ? 'text-realm-gold' : 'text-white/38'}
            />
          </button>
        </div>
      </div>

      {/* ── XP progress bar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pb-2.5 pt-0.5">
        <div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #c43050, #e05070, #f07090)',
              boxShadow: '0 0 6px rgba(224,80,112,0.5)',
            }}
          />
        </div>
        <span className="forge-mono text-[10px] text-white/28 tabular-nums whitespace-nowrap select-none">
          {xpIntoLevel.toLocaleString()}/{xpForNext.toLocaleString()}{!next ? ' max' : ''}
        </span>
      </div>

      <SyncPanel
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        onTokenSaved={() => setSyncRev((n) => n + 1)}
      />
    </header>
  )
}
