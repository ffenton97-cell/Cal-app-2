import { useState, useEffect, useRef } from 'react'
import { format, subDays } from 'date-fns'
import {
  Flame, Dumbbell, CheckCheck, ChevronUp, ChevronDown, Clock, Zap, Sunrise,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEntry, saveEntry } from '../hooks/useEntry'
import { awardXP } from '../hooks/useXP'
import { useStreaks } from '../hooks/useStreaks'
import { XP as XP_VALUES, USER, GYM_SCHEDULE } from '../theme'
import { db } from '../db'
import { fetchXPContext } from '../lib/xpContext.js'
import { buildMorningBriefSystemPrompt } from '../lib/claudeContext.js'
import { callClaudeProxy } from '../lib/claudeClient.js'
import SectionLabel from '../components/SectionLabel'

const MOODS = [
  { id: 'DIALED',  color: '#4ade80' },
  { id: 'SOLID',   color: '#d4a853' },
  { id: 'STEADY',  color: '#8a8a8a' },
  { id: 'DRAINED', color: '#fb923c' },
  { id: 'COOKED',  color: '#f87171' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Bar({ value, max }) {
  const pct   = Math.min(value / max, 1)
  const color = pct >= 0.85 ? '#4ade80' : pct >= 0.4 ? '#d4a853' : '#525252'
  return (
    <div className="h-[3px] bg-realm-track w-full mt-2">
      <div
        className="h-full transition-all duration-500"
        style={{
          width: `${pct * 100}%`,
          background: color,
          boxShadow: pct >= 0.85 ? `0 0 6px ${color}80` : 'none',
        }}
      />
    </div>
  )
}

function MacroStat({ label, value, good }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="ios-label">{label}</span>
      <span className="ff-mono text-[12px]" style={{ color: good ? '#4ade80' : '#d4a853' }}>
        {value}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckIn({ onXP }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const dow      = new Date().getDay()
  const isGymDay = dow in GYM_SCHEDULE
  const gymTime  = GYM_SCHEDULE[dow]

  const existingEntry          = useEntry()
  const { checkInStreak, gymStreak } = useStreaks()
  const prevEntry = useLiveQuery(
    () => db.entries.get(format(subDays(new Date(), 1), 'yyyy-MM-dd')),
    []
  )

  // form state
  const [weight,     setWeight]     = useState('')
  const [cals,       setCals]       = useState('')
  const [protein,    setProtein]    = useState('')
  const [gym,        setGym]        = useState(false)
  const [mood,       setMood]       = useState(null)
  const [win,        setWin]        = useState('')
  const [sales,      setSales]      = useState('')
  const [saved,      setSaved]      = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefErr, setBriefErr] = useState(null)
  const [briefText, setBriefText] = useState(null)

  const prefilled  = useRef(false)
  const alreadyXPd = useRef(false)

  // Pre-fill once when Dexie resolves
  useEffect(() => {
    if (existingEntry === undefined) return
    if (prefilled.current) return
    prefilled.current = true
    if (!existingEntry) return

    alreadyXPd.current = true
    setWeight(existingEntry.weight  != null ? String(existingEntry.weight)  : '')
    setCals(existingEntry.cals      != null ? String(existingEntry.cals)    : '')
    setProtein(existingEntry.protein != null ? String(existingEntry.protein) : '')
    setGym(!!existingEntry.gym)
    setMood(existingEntry.mood ?? null)
    setWin(existingEntry.win   ?? '')
    setSales(existingEntry.sales ?? '')
    setSaved(true)
  }, [existingEntry])

  // derived
  const weightNum  = parseFloat(weight) || null
  const calsNum    = parseInt(cals, 10) || 0
  const proteinNum = parseInt(protein, 10) || 0

  const weightDelta  = weightNum != null
    ? +(weightNum - USER.weightTarget).toFixed(1) : null
  const weightChange = weightNum != null && prevEntry?.weight != null
    ? +(weightNum - prevEntry.weight).toFixed(2) : null

  const xpGain = alreadyXPd.current ? 0
    : XP_VALUES.checkIn
    + (weightNum             ? XP_VALUES.logWeight : 0)
    + (calsNum || proteinNum ? XP_VALUES.logFood   : 0)
    + (gym                   ? 2 : 0)
    + (win.trim()            ? 2 : 0)
    + (sales.trim()          ? 2 : 0)

  const weightRange = USER.weightStart - USER.weightTarget
  const weightProg  = weightNum != null
    ? Math.min(Math.max(0, USER.weightStart - weightNum) / weightRange, 1) : 0

  async function handleMorningBrief() {
    if (briefLoading) return
    setBriefLoading(true)
    setBriefErr(null)
    setBriefText(null)
    try {
      const system = await buildMorningBriefSystemPrompt()
      const user =
        'Deliver the morning briefing now (the system prompt already contains instructions and live intelligence).'
      const reply = await callClaudeProxy({
        system,
        messages: [{ role: 'user', content: user }],
        max_tokens: 600,
      })
      setBriefText(reply)
    } catch (e) {
      setBriefErr(e?.message || 'Request failed')
    } finally {
      setBriefLoading(false)
    }
  }

  // submit
  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)

    await saveEntry(todayStr, {
      weight:   weightNum,
      cals:     calsNum   || null,
      protein:  proteinNum || null,
      gym,
      mood,
      moodWord: mood,
      win:      win.trim()   || null,
      sales:    sales.trim() || null,
    })

    if (!alreadyXPd.current) {
      alreadyXPd.current = true
      const ctx = await fetchXPContext()
      ctx.checkInStreak = checkInStreak + 1
      const { unlockedAchievements } = await awardXP(xpGain, ctx)
      onXP?.({ amount: xpGain, achievement: unlockedAchievements[0] ?? null })
    }

    setSaved(true)
    setSubmitting(false)
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">

      {/* gym banner */}
      {isGymDay && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2
          border-l-2 border-realm-gold bg-realm-gold/8">
          <Clock size={11} className="text-realm-gold shrink-0" />
          <span className="ff-mono text-[11px] text-realm-gold tracking-widest uppercase">
            Gym scheduled — {gymTime}
          </span>
        </div>
      )}

      {/* header */}
      <div className="mb-4">
        <h1 className="ios-title">
          Check-in
        </h1>
        <p className="text-[11px] text-realm-faint mt-1">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* streak + xp row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-[10px] bg-realm-panel border border-realm-hairline py-1.5 px-2.5">
          <Flame size={12} className="text-[#fb923c]" />
          <span className="ff-mono text-[12px] text-realm-text tabular-nums">{checkInStreak}</span>
          <span className="ff-mono text-[10px] text-realm-muted">day streak</span>
        </div>

        {gymStreak > 0 && (
          <div className="flex items-center gap-1.5 rounded-[10px] bg-realm-panel border border-realm-hairline py-1.5 px-2.5">
            <Dumbbell size={12} className="text-realm-gold" />
            <span className="ff-mono text-[12px] text-realm-text tabular-nums">{gymStreak}</span>
            <span className="ff-mono text-[10px] text-realm-muted">gym streak</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1 px-2.5 py-1.5
          bg-realm-gold/10 border border-realm-gold/25">
          <Zap size={11} className="text-realm-gold" />
          <span className="ff-mono text-[12px] text-realm-gold font-medium tabular-nums">
            {alreadyXPd.current ? 'FILED' : `+${xpGain} XP`}
          </span>
        </div>
      </div>

      {/* filed banner */}
      {saved && (
        <div className="flex items-center gap-2 mb-5 px-3 py-2
          bg-[#4ade8010] border border-[#4ade8028]">
          <CheckCheck size={12} className="text-[#4ade80] shrink-0" />
          <span className="ff-mono text-[11px] text-[#4ade80] tracking-widest uppercase">
            Debrief on file — tap any field to edit
          </span>
        </div>
      )}

      {/* ── BODY WEIGHT ── */}
      <div className="mb-5">
        <SectionLabel>Body Weight</SectionLabel>

        <div className="flex items-center gap-3">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder="—"
            className="fl-input text-2xl ff-mono text-center py-3 w-28"
          />
          <span className="ff-mono text-realm-muted text-sm">kg</span>

          {weightChange != null && (
            <span className={`ff-mono text-[11px] flex items-center gap-0.5 tabular-nums
              ${weightChange > 0 ? 'text-[#f87171]' : weightChange < 0 ? 'text-[#4ade80]' : 'text-realm-muted'}`}>
              {weightChange > 0 && <ChevronUp size={12} />}
              {weightChange < 0 && <ChevronDown size={12} />}
              {weightChange > 0 ? '+' : ''}{weightChange}
            </span>
          )}
        </div>

        {weightDelta != null && (
          <p className="ff-mono text-[11px] mt-1.5">
            <span className={weightDelta <= 0 ? 'text-[#4ade80]' : 'text-realm-muted'}>
              {weightDelta <= 0 ? '✓ TARGET HIT' : `${weightDelta}kg to target`}
            </span>
            <span className="text-[#2a2a2a]"> / {USER.weightTarget}kg goal</span>
          </p>
        )}

        {weightNum != null && (
          <div className="mt-2">
            <div className="h-[3px] bg-realm-track w-full">
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${weightProg * 100}%`,
                  background: weightProg >= 1 ? '#4ade80' : '#d4a853',
                  boxShadow:  weightProg >= 1
                    ? '0 0 6px #4ade8080' : '0 0 4px #d4a85340',
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="ff-mono text-[9px] text-[#2a2a2a]">{USER.weightStart}kg</span>
              <span className="ff-mono text-[9px] text-[#2a2a2a]">{USER.weightTarget}kg</span>
            </div>
          </div>
        )}
      </div>

      {/* ── NUTRITION ── */}
      <div className="mb-5">
        <SectionLabel>Nutrition</SectionLabel>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="ios-label block mb-1.5">
              Calories
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={cals}
              onChange={e => setCals(e.target.value)}
              placeholder="—"
              className="fl-input ff-mono text-lg text-center py-2.5"
            />
            <Bar value={calsNum} max={USER.cutCals} />
            <div className="flex justify-between mt-1">
              <span className="ff-mono text-[9px]"
                style={{ color: calsNum > 0 ? (calsNum >= USER.cutCals * 0.85 ? '#4ade80' : '#d4a853') : '#2a2a2a' }}>
                {calsNum || '—'}
              </span>
              <span className="ff-mono text-[9px] text-[#2a2a2a]">{USER.cutCals}</span>
            </div>
          </div>

          <div>
            <label className="ios-label block mb-1.5">
              Protein
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={protein}
              onChange={e => setProtein(e.target.value)}
              placeholder="—"
              className="fl-input ff-mono text-lg text-center py-2.5"
            />
            <Bar value={proteinNum} max={USER.cutProtein} />
            <div className="flex justify-between mt-1">
              <span className="ff-mono text-[9px]"
                style={{ color: proteinNum > 0 ? (proteinNum >= USER.cutProtein * 0.85 ? '#4ade80' : '#d4a853') : '#2a2a2a' }}>
                {proteinNum || '—'}g
              </span>
              <span className="ff-mono text-[9px] text-[#2a2a2a]">{USER.cutProtein}g</span>
            </div>
          </div>
        </div>

        {calsNum > 0 && proteinNum > 0 && (
          <div className="mt-2 ios-card flex gap-5">
            <MacroStat
              label="P/cal"
              value={`${((proteinNum / calsNum) * 100).toFixed(0)}%`}
              good={(proteinNum / calsNum) * 100 >= 35}
            />
            <MacroStat
              label="Cal left"
              value={`${Math.max(0, USER.cutCals - calsNum)}`}
              good={USER.cutCals - calsNum >= 0}
            />
            <MacroStat
              label="Protein gap"
              value={`${Math.max(0, USER.cutProtein - proteinNum)}g`}
              good={USER.cutProtein - proteinNum <= 20}
            />
          </div>
        )}
      </div>

      {/* ── TRAINING ── */}
      <div className="mb-5">
        <SectionLabel>Training</SectionLabel>
        <button
          type="button"
          onClick={() => setGym(v => !v)}
          className="w-full py-4 ff-mono text-[13px] tracking-[0.15em] uppercase
            font-medium border transition-all duration-150 active:scale-[0.99]"
          style={{
            background:  gym ? '#d4a85314' : '#161616',
            borderColor: gym ? '#d4a853'   : '#252525',
            color:       gym ? '#d4a853'   : '#3a3a3a',
          }}
        >
          {gym ? '✓  Trained Today' : '—  Did Not Train'}
        </button>
      </div>

      {/* ── STATUS ── */}
      <div className="mb-5">
        <SectionLabel>Status</SectionLabel>
        <div className="grid grid-cols-5 gap-1">
          {MOODS.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMood(mood === m.id ? null : m.id)}
              className="py-3 ff-mono text-[9px] uppercase tracking-wider border
                transition-all duration-150"
              style={{
                borderColor:     mood === m.id ? m.color : '#252525',
                color:           mood === m.id ? m.color : '#3a3a3a',
                backgroundColor: mood === m.id ? `${m.color}14` : '#161616',
              }}
            >
              {m.id}
            </button>
          ))}
        </div>
      </div>

      {/* ── Notes & wins ── */}
      <div className="mb-6">
        <SectionLabel>Notes &amp; wins</SectionLabel>
        <div className="space-y-3">
          <div>
            <label className="ios-label block mb-1.5">
              Win of the Day
            </label>
            <textarea
              rows={2}
              value={win}
              onChange={e => setWin(e.target.value)}
              placeholder="What did you nail today?"
              className="fl-input ff-mono text-[13px] resize-none"
              style={{ padding: '0.6rem 0.75rem' }}
            />
          </div>
          <div>
            <label className="ios-label block mb-1.5">
              Sales Highlight
            </label>
            <textarea
              rows={2}
              value={sales}
              onChange={e => setSales(e.target.value)}
              placeholder="Deal advanced, meeting booked, conversation worth noting…"
              className="fl-input ff-mono text-[13px] resize-none"
              style={{ padding: '0.6rem 0.75rem' }}
            />
          </div>
        </div>
      </div>

      {/* ── Morning brief (FORGE) ── */}
      <div className="mb-4">
        <button
          type="button"
          disabled={briefLoading}
          onClick={handleMorningBrief}
          className="w-full flex items-center justify-center gap-2 py-3 ff-mono text-[11px] uppercase tracking-wider border border-realm-border text-realm-soft hover:text-realm-gold hover:border-realm-gold/35 disabled:opacity-40"
        >
          <Sunrise size={18} strokeWidth={1.8} />
          {briefLoading ? 'Running brief…' : 'Run morning brief'}
        </button>
        {briefErr && (
          <p className="ff-mono text-[11px] text-[#f87171] mt-2 border border-[#f8717140] p-2">
            {briefErr}
          </p>
        )}
        {briefText && (
          <div className="mt-3 ios-card border border-realm-gold/25">
            <p className="ff-mono text-[9px] text-realm-gold uppercase tracking-widest mb-2">
              Brief
            </p>
            <p className="ff-mono text-[12px] text-realm-text-soft leading-relaxed whitespace-pre-wrap">
              {briefText}
            </p>
          </div>
        )}
      </div>

      {/* ── SUBMIT ── */}
      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        className="w-full py-4 ff-mono text-[13px] tracking-[0.2em] uppercase
          font-medium border transition-all duration-150 active:scale-[0.995]"
        style={{
          borderColor:     submitting ? '#252525' : '#d4a853',
          color:           submitting ? '#333'    : '#d4a853',
          backgroundColor: submitting ? '#161616' : '#d4a85316',
        }}
      >
        {submitting
          ? 'Filing…'
          : saved
            ? 'Update Debrief'
            : `Submit Debrief${xpGain > 0 ? ` — +${xpGain} XP` : ''}`}
      </button>

    </div>
  )
}
