import { useState, useEffect, useRef } from 'react'
import { format, subDays } from 'date-fns'
import { BookOpen, MessageCircle, Zap, Shield } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDayNote, saveDayNote } from '../hooks/useDayNotes'
import { awardXP } from '../hooks/useXP'
import { XP as XP_VALUES } from '../theme'
import { db } from '../db'
import { buildAccountabilitySystemPrompt } from '../lib/claudeContext.js'
import { callClaudeProxy } from '../lib/claudeClient.js'
export default function Journal({ onXP }) {
  const todayStr  = format(new Date(), 'yyyy-MM-dd')
  const todayNote = useDayNote()

  const pastDates = Array.from({ length: 6 }, (_, i) =>
    format(subDays(new Date(), i + 1), 'yyyy-MM-dd')
  )
  const pastNotes = useLiveQuery(
    () => Promise.all(pastDates.map(d => db.dayNotes.get(d))),
    []
  )

  const [text,  setText]  = useState('')
  const [saved, setSaved] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiErr, setAiErr] = useState(null)
  const [aiReply, setAiReply] = useState(null)
  const [tab, setTab] = useState('today')

  const armoury = useLiveQuery(() => db.armoury.orderBy('filedAt').reverse().toArray(), [])

  const prefilled  = useRef(false)
  const alreadyXPd = useRef(false)

  useEffect(() => {
    if (todayNote === undefined) return
    if (prefilled.current) return
    prefilled.current = true
    if (!todayNote) return
    setText(todayNote.notes?.[0] ?? '')
    alreadyXPd.current = true
    setSaved(true)
  }, [todayNote])

  async function handleOperatorPass() {
    if (!text.trim() || aiLoading) return
    setAiLoading(true)
    setAiErr(null)
    setAiReply(null)
    try {
      const system = await buildAccountabilitySystemPrompt()
      const user = `Today's log:\n"""\n${text.trim()}\n"""\n\nFORGE response: mirror the signal in one line, name drift if any, one challenge, one next move. ≤180 words. No markdown headings.`
      const reply = await callClaudeProxy({
        system,
        messages: [{ role: 'user', content: user }],
        max_tokens: 600,
      })
      setAiReply(reply)
    } catch (e) {
      setAiErr(e?.message || 'Request failed')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleBlur() {
    if (!text.trim()) return
    await saveDayNote(todayStr, text)
    setSaved(true)
    if (!alreadyXPd.current && text.trim().length > 20) {
      alreadyXPd.current = true
      const { unlockedAchievements } = await awardXP(XP_VALUES.journalEntry, {
        totalCheckIns: 0, checkInStreak: 0, totalWorkouts: 0,
        totalGoals: 0, completedGoals: 0, outboundDays: 0, totalCalls: 0,
        totalWeightLogs: 0, totalScans: 0, totalFinanceLogs: 0,
      })
      onXP?.({ amount: XP_VALUES.journalEntry, achievement: unlockedAchievements[0] ?? null })
    }
  }

  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="ff-heading text-[20px] font-semibold tracking-tight leading-none text-[#f5f0f0]">
            Journal
          </h1>
          <p className="forge-mono mt-1 text-[10px] text-[rgba(255,255,255,0.18)]">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        {tab === 'today' && !alreadyXPd.current && (
          <div className="flex items-center gap-1 px-2.5 py-1.5
            bg-realm-gold/10 border border-realm-gold/25">
            <Zap size={11} className="text-realm-gold" />
            <span className="ff-mono text-[11px] text-realm-gold">+{XP_VALUES.journalEntry} XP</span>
          </div>
        )}
      </div>

      <div className="flex gap-0 mb-5 border border-realm-border">
        <button
          type="button"
          onClick={() => setTab('today')}
          className={`flex-1 py-2.5 ff-mono text-[10px] uppercase tracking-wider ${
            tab === 'today' ? 'bg-realm-inset text-realm-gold' : 'text-realm-muted'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setTab('armoury')}
          className={`flex-1 py-2.5 ff-mono text-[10px] uppercase tracking-wider border-l border-realm-border ${
            tab === 'armoury' ? 'bg-realm-inset text-realm-gold' : 'text-realm-muted'
          }`}
        >
          Quotes
        </button>
      </div>

      {tab === 'armoury' && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-realm-gold" />
            <span className="forge-mono text-[9px] uppercase tracking-[0.1em] text-[rgba(255,255,255,0.12)]">
              Filed quotes
            </span>
          </div>
          {armoury === undefined ? (
            <p className="ff-mono text-[11px] text-realm-faint">Loading…</p>
          ) : armoury.length === 0 ? (
            <p className="text-[12.5px] leading-[1.65] text-[rgba(255,255,255,0.32)]">
              ↗ save from Home → lands here.
            </p>
          ) : (
            <div className="space-y-5">
              {armoury.map((row) => (
                <div key={row.id} className="border border-realm-border bg-realm-panel px-3 py-3">
                  <p className="ff-mono text-[11px] text-realm-text-soft leading-relaxed uppercase tracking-wide whitespace-pre-wrap">
                    &ldquo;{row.text}&rdquo;
                  </p>
                  <p className="ff-mono text-[10px] text-realm-muted mt-2 text-right tracking-[0.12em] uppercase">
                    — {row.author}
                  </p>
                  <p className="ff-mono text-[9px] text-[#2a2a2a] mt-1 uppercase">
                    {[row.category, row.deskDate ? format(new Date(row.deskDate + 'T12:00:00'), 'd MMM yyyy') : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'today' && (
      <>
      <div className="mb-7">
        <div className="mb-3 flex items-center gap-3">
          <span className="forge-mono text-[9px] font-normal uppercase tracking-[0.1em] text-[rgba(255,255,255,0.12)]">
            Today
          </span>
          <div className="h-px flex-1 bg-[rgba(220,60,80,0.06)]" />
          {saved && (
            <span className="forge-mono shrink-0 text-[9px] tracking-[0.06em] text-realm-sage">saved</span>
          )}
        </div>
        <textarea
          rows={10}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={handleBlur}
          placeholder={`${format(new Date(), 'EEEE')} — signal, friction, win`}
          className="fl-input w-full resize-none text-[12.5px] font-normal leading-[1.65] text-[rgba(255,255,255,0.55)]"
          style={{ padding: '0.75rem', minHeight: '220px' }}
          autoFocus
        />
        <p className="forge-mono mt-1 text-[9px] tracking-[0.06em] text-[rgba(255,255,255,0.18)]">
          saves on blur
        </p>

        <button
          type="button"
          disabled={!text.trim() || aiLoading}
          onClick={handleOperatorPass}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[7px] border border-[rgba(220,60,80,0.18)] bg-[rgba(220,60,80,0.07)] py-3 text-[12px] font-medium text-realm-gold disabled:cursor-not-allowed disabled:opacity-30"
        >
          <MessageCircle size={16} strokeWidth={1.8} />
          {aiLoading ? 'Running pass…' : 'Run operator pass'}
        </button>

        {aiErr && (
          <p className="mt-2 rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(212,160,80,0.06)] p-2 text-[12px] text-[rgba(255,255,255,0.55)]">
            {aiErr}
          </p>
        )}
        {aiReply && (
          <div className="mt-3 rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
            <p className="forge-mono mb-2 text-[9px] uppercase tracking-[0.08em] text-[rgba(224,80,112,0.6)]">
              FORGE
            </p>
            <p className="whitespace-pre-wrap text-[12.5px] font-normal leading-[1.65] text-[rgba(255,255,255,0.55)]">
              {aiReply}
            </p>
          </div>
        )}
      </div>

      {/* past entries */}
      {pastNotes?.some(Boolean) && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="forge-mono text-[9px] font-normal uppercase tracking-[0.1em] text-[rgba(255,255,255,0.12)]">
              Back
            </span>
            <div className="h-px flex-1 bg-[rgba(220,60,80,0.06)]" />
          </div>
          <div className="space-y-4">
            {pastDates.map((d, i) => {
              const note  = pastNotes?.[i]
              const entry = note?.notes?.[0]
              if (!entry) return null
              return (
                <div key={d} className="border-l-2 border-realm-border pl-3">
                  <p className="ff-mono text-[10px] text-realm-muted uppercase tracking-widest mb-1.5">
                    {format(new Date(d + 'T00:00:00'), 'EEE d MMM')}
                  </p>
                  <p className="ff-mono text-[12px] text-realm-soft leading-relaxed line-clamp-4">
                    {entry}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!text && !saved && !pastNotes?.some(Boolean) && (
        <div className="py-16 text-center">
          <BookOpen size={28} className="mx-auto mb-3 text-[rgba(255,255,255,0.12)]" />
          <p className="text-[12px] text-[rgba(255,255,255,0.32)]">Empty</p>
          <p className="mt-1 text-[11px] text-[rgba(255,255,255,0.18)]">Open Today and log signal.</p>
        </div>
      )}
      </>
      )}

    </div>
  )
}
