'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Cloud } from 'lucide-react'
import { useXP } from '../hooks/useXP'
import { useStreaks } from '../hooks/useStreaks'
import SyncPanel from './SyncPanel'
import { getSyncToken } from '../lib/dexieSnapshot.js'
import { FORGE_ICON_GRADIENT } from '../theme'

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
    <header className="fl-header-safe shrink-0 bg-realm-bg-mid">
      <div className="flex h-[52px] items-center justify-between gap-3 border-b border-[rgba(220,60,80,0.1)] px-4">
        <span className="text-[15px] font-semibold tracking-tight text-[#f5f0f0]">FORGE</span>
        <div className="flex items-center gap-2.5">
          <div className="forge-mono flex items-center gap-2 text-[11px] text-[rgba(255,255,255,0.28)]">
            <span className="forge-pulse-dot shrink-0" aria-hidden />
            <span>{syncOn ? 'sync' : 'local'}</span>
            {checkInStreak > 0 && (
              <span className="text-[rgba(255,255,255,0.28)]">· {checkInStreak}d</span>
            )}
            {earnedToday > 0 && (
              <span className="text-realm-gold tabular-nums">+{earnedToday} xp</span>
            )}
          </div>
          <div
            className="h-[26px] w-[26px] shrink-0 rounded-full border border-[rgba(220,60,80,0.2)]"
            style={{ background: FORGE_ICON_GRADIENT }}
            aria-hidden
          />
          <button
            type="button"
            onClick={() => setSyncOpen(true)}
            className="rounded-md p-1.5 text-[rgba(255,255,255,0.32)] transition-colors duration-150 ease-out hover:bg-white/[0.04] hover:text-[#f5f0f0]"
            aria-label="Sync"
            title="Sync"
          >
            <Cloud size={16} strokeWidth={1.5} className={syncOn ? 'text-realm-gold' : ''} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-2">
        <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-realm-track">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #c43050, #e05070)',
            }}
          />
        </div>
        <span className="forge-mono text-[11px] tabular-nums text-[rgba(255,255,255,0.28)] whitespace-nowrap">
          Lv{current.level} · {xpIntoLevel.toLocaleString()}/{xpForNext.toLocaleString()}{next ? '' : ' max'}
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
