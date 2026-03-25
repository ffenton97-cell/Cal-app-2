import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import { db } from '../db'
import { awardXP } from '../hooks/useXP'
import { XP } from '../theme'
import { getOrInitSalesUX, updateSalesUX } from '../lib/salesUX.js'

const SUGGESTIONS = [
  '…approach every no as data, not rejection',
  '…find the prospect who needs what I have',
  '…be the most prepared person on every call',
  '…earn the next 30 seconds on every call',
  '…stay curious longer than they stay guarded',
]

function playLockFeedback() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (Ctx) {
      const ctx = new Ctx()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g)
      g.connect(ctx.destination)
      o.frequency.value = 520
      g.gain.setValueAtTime(0.12, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
      o.start()
      o.stop(ctx.currentTime + 0.12)
    }
  } catch {
    /* ignore */
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(45)
}

function flashPhonesHot() {
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.className = 'fixed inset-0 z-[100] pointer-events-none'
  el.style.background = 'linear-gradient(135deg, #deb566 0%, #a894e8 100%)'
  el.style.opacity = '0.92'
  document.body.appendChild(el)
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 0.26s ease-out'
    el.style.opacity = '0'
  })
  window.setTimeout(() => el.remove(), 300)
}

export default function PreDialRitualModal({ open, onClose, defaultDialTarget, onXP }) {
  const [step, setStep] = useState(1)
  const [dials, setDials] = useState(String(defaultDialTarget ?? 20))
  const [intention, setIntention] = useState('')

  useEffect(() => {
    if (!open) return
    setStep(1)
    setDials(String(defaultDialTarget ?? 20))
    setIntention('')
  }, [open, defaultDialTarget])

  if (!open) return null

  const today = format(new Date(), 'yyyy-MM-dd')

  async function handlePhonesHot() {
    const n = Math.max(1, parseInt(String(dials).replace(/\D/g, ''), 10) || 20)
    const intent =
      intention.trim() || `Today I will ${SUGGESTIONS[0].replace(/^…\s*/, '')}`
    flashPhonesHot()
    playLockFeedback()

    const ux = await getOrInitSalesUX()
    let grantXp = 0
    if (ux.sessionLockXpDay !== today) {
      const [outboundDays, allRecords, totalCheckIns, totalWorkouts, totalGoals, completedGoals, totalWeightLogs, totalScans, totalFinanceLogs] =
        await Promise.all([
          db.outbound.count(),
          db.outbound.toArray(),
          db.entries.count(),
          db.workouts.count(),
          db.goals.count(),
          db.goals.filter((g) => g.completed).count(),
          db.entries.filter((e) => !!e.weight).count(),
          db.scans.count(),
          db.finance.count(),
        ])
      const totalCalls = allRecords.reduce((s, r) => s + (r.calls || 0), 0)
      await awardXP(XP.sessionLock, {
        outboundDays,
        totalCalls,
        totalCheckIns,
        checkInStreak: 0,
        totalWorkouts,
        totalGoals,
        completedGoals,
        totalWeightLogs,
        totalScans,
        totalFinanceLogs,
      })
      grantXp = XP.sessionLock
    }

    await updateSalesUX({
      sessionDialTarget: n,
      sessionIntention: intent,
      sessionStartedAt: Date.now(),
      sessionDay: today,
      ...(grantXp ? { sessionLockXpDay: today } : {}),
    })

    if (grantXp) onXP?.({ amount: grantXp, achievement: null })
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/75 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4">
      <div
        className="w-full max-w-lg border border-realm-hairline bg-realm-deep shadow-2xl max-h-[min(92dvh,640px)] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="predial-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-realm-border shrink-0">
          <h2 id="predial-title" className="text-sm font-semibold tracking-tight text-[#f5f0f0]">
            Session lock
          </h2>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="p-2 text-realm-muted hover:text-realm-gold border border-transparent hover:border-realm-border"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-[12.5px] leading-[1.65] text-[rgba(255,255,255,0.55)]">
          {step === 1 && (
            <>
              <p className="forge-mono text-[10px] tracking-[0.06em] text-[rgba(224,80,112,0.6)]">
                Step 1 — dial target
              </p>
              <p>Dial count for this session. Pick what you’ll actually run.</p>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={dials}
                onChange={(e) => setDials(e.target.value)}
                className="fl-input w-full text-center text-2xl py-3"
              />
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full rounded-[7px] border border-[rgba(220,60,80,0.18)] bg-[rgba(220,60,80,0.07)] py-3 text-[12px] font-medium text-realm-gold"
              >
                Lock target
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="forge-mono text-[10px] tracking-[0.06em] text-[rgba(224,80,112,0.6)]">
                Step 2 — intention
              </p>
              <p>One line. Today I will…</p>
              <input
                type="text"
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder="Today I will…"
                className="fl-input w-full py-2.5"
              />
              <div className="space-y-1.5">
                <p className="text-[9px] text-realm-muted uppercase tracking-wider">Tap to borrow</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setIntention(`Today I will ${s.replace(/^…/, '')}`)}
                    className="block w-full text-left py-2 px-2 border border-realm-border text-[11px] text-realm-soft hover:border-realm-gold/35 hover:text-realm-text-soft"
                  >
                    Today I will {s.replace(/^…/, '')}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 border border-realm-border text-realm-muted uppercase text-[10px] tracking-wider"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-2.5 border border-realm-gold/45 text-realm-gold uppercase text-[10px] tracking-wider"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="forge-mono text-[10px] tracking-[0.06em] text-[rgba(224,80,112,0.6)]">
                Step 3 — go
              </p>
              <p className="text-center text-[11px] text-[rgba(255,255,255,0.32)]">
                {Math.max(1, parseInt(String(dials).replace(/\D/g, ''), 10) || 20)} dials locked · start
              </p>
              <button
                type="button"
                onClick={handlePhonesHot}
                className="mt-4 w-full rounded-[7px] bg-[#c43050] py-6 text-base font-semibold text-white transition-opacity duration-150 ease-out hover:opacity-95 active:opacity-90"
              >
                Start session
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2 text-[10px] uppercase tracking-wider text-realm-muted hover:text-realm-soft"
              >
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
