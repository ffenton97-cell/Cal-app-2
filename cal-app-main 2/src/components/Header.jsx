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
      <div className="flex h-[50px] items-center justify-between gap-3 border-b border-[rgba(220,60,80,0.1)] px-3 md:px-4">
        <span className="text-[14px] font-semibold tracking-tight text-[#f5f0f0]">FORGE</span>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-[rgba(255,255,255,0.32)] md:inline">
            Primary
          </span>
          <div
            className="h-6 w-6 shrink-0 rounded-full border border-[rgba(220,60,80,0.18)]"
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

      <div className="flex h-8 items-center justify-between gap-2 border-b border-[rgba(220,60,80,0.06)] px-3 md:px-4">
        <div className="forge-mono flex items-center gap-2 text-[10px] text-[rgba(255,255,255,0.18)]">
          <span className="forge-pulse-dot shrink-0" aria-hidden />
          <span>live</span>
          <span className="text-[rgba(255,255,255,0.12)]">·</span>
          <span>{syncOn ? 'sync on' : 'local'}</span>
          {checkInStreak > 0 && (
            <>
              <span className="text-[rgba(255,255,255,0.12)]">·</span>
              <span>streak {checkInStreak}</span>
            </>
          )}
        </div>
        <div className="forge-mono flex items-center gap-2 text-[10px] text-[rgba(255,255,255,0.18)]">
          {earnedToday > 0 && (
            <span className="text-realm-gold tabular-nums">+{earnedToday} xp</span>
          )}
          <span>Lv{current.level}</span>
          <span className="tabular-nums">{format(new Date(), 'EEE d MMM')}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 md:px-4">
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-realm-track">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #c43050, #e05070)',
            }}
          />
        </div>
        <span className="forge-mono text-[10px] tabular-nums text-[rgba(255,255,255,0.18)] whitespace-nowrap">
          {xpIntoLevel.toLocaleString()}/{xpForNext.toLocaleString()}
          {next ? '' : ' max'}
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
