import { useState, useEffect, useRef } from 'react'
import { useHash } from '../hooks/useHash'
import { format, subDays } from 'date-fns'
import { CheckCheck, Zap, Flame, Swords } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useOutbound, saveOutbound } from '../hooks/useOutbound'
import { awardXP } from '../hooks/useXP'
import { calcStreak } from '../hooks/useStreaks.js'
import { XP as XP_VALUES } from '../theme'
import { db } from '../db'
import { getOrInitSalesUX, updateSalesUX } from '../lib/salesUX.js'
import { scenarioForToday, tierForDrillStreak } from '../data/objectionDrills.js'
import { OBJECTION_DRILL_SYSTEM, buildObjectionDrillUserMessage } from '../lib/claudeContext.js'
import { callClaudeProxy } from '../lib/claudeClient.js'
import SectionLabel from '../components/SectionLabel'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(num, den) {
  if (!den || !num) return null
  return Math.round((num / den) * 100)
}

function rateColor(p) {
  if (p == null) return '#525252'
  if (p >= 40)   return '#4ade80'
  if (p >= 20)   return '#d4a853'
  return '#f87171'
}

function parseDrillReply(raw) {
  const coaching = raw.match(/COACHING:\s*(.+?)(?:\r?\n|$)/is)
  const d = raw.match(/SCORE_DIRECTNESS:\s*(\d+)/i)
  const c = raw.match(/SCORE_CURIOSITY:\s*(\d+)/i)
  const n = raw.match(/SCORE_NEXTSTEP:\s*(\d+)/i)
  return {
    coaching: coaching?.[1]?.trim() ?? null,
    directness: d?.[1] ?? null,
    curiosity: c?.[1] ?? null,
    nextstep: n?.[1] ?? null,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricInput({ label, value, onChange, sub }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <label className="ff-mono text-[9px] uppercase tracking-widest text-realm-muted">
        {label}
      </label>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        className="fl-input ff-mono text-xl text-center py-2.5 w-full"
      />
      {sub != null && (
        <span
          className="ff-mono text-[10px] tabular-nums"
          style={{ color: typeof sub === 'number' ? rateColor(sub) : '#525252' }}
        >
          {typeof sub === 'number' ? `${sub}%` : sub}
        </span>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Outbound({ onXP }) {
  const hash = useHash()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const existing = useOutbound()

  const salesUx = useLiveQuery(() => getOrInitSalesUX(), [])

  const [drill, setDrill] = useState({
    reply: '', loading: false, err: null, coach: null, scores: null, prospectLine: null,
  })

  useEffect(() => {
    if (hash !== 'outbound-drill') return
    window.requestAnimationFrame(() => {
      document.getElementById('outbound-drill')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [hash])

  // ── weekly rollup (last 5 weekdays including today) ──────────────────────
  const weeklyStats = useLiveQuery(async () => {
    const days = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(), i), 'yyyy-MM-dd')
    )
    const records = await Promise.all(days.map(d => db.outbound.get(d)))
    const live = records.filter(Boolean)
    return {
      days:     live.length,
      calls:    live.reduce((s, r) => s + (r.calls    || 0), 0),
      convos:   live.reduce((s, r) => s + (r.convos   || 0), 0),
      emails:   live.reduce((s, r) => s + (r.emails   || 0), 0),
      meetings: live.reduce((s, r) => s + (r.meetings || 0), 0),
    }
  }, [])

  // ── outbound streak ───────────────────────────────────────────────────────
  const outboundStreak = useLiveQuery(() => calcStreak('outbound'), [])

  // ── form state ────────────────────────────────────────────────────────────
  const [calls,       setCalls]       = useState('')
  const [connected,   setConnected]   = useState('')
  const [convos,      setConvos]      = useState('')
  const [emails,      setEmails]      = useState('')
  const [replies,     setReplies]     = useState('')
  const [meetings,    setMeetings]    = useState(0)
  const [liConnects,  setLiConnects]  = useState('')
  const [liAccepted,  setLiAccepted]  = useState('')
  const [liDms,       setLiDms]       = useState('')
  const [notes,       setNotes]       = useState('')
  const [saved,       setSaved]       = useState(false)
  const [submitting,  setSubmitting]  = useState(false)

  const prefilled  = useRef(false)
  const alreadyXPd = useRef(false)

  // ── pre-fill ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (existing === undefined) return
    if (prefilled.current) return
    prefilled.current = true
    if (!existing) return

    alreadyXPd.current = true
    setCalls(existing.calls       != null ? String(existing.calls)       : '')
    setConnected(existing.connected != null ? String(existing.connected) : '')
    setConvos(existing.convos     != null ? String(existing.convos)     : '')
    setEmails(existing.emails     != null ? String(existing.emails)     : '')
    setReplies(existing.replies   != null ? String(existing.replies)    : '')
    setMeetings(existing.meetings != null ? existing.meetings           : 0)
    setLiConnects(existing.liConnects != null ? String(existing.liConnects) : '')
    setLiAccepted(existing.liAccepted != null ? String(existing.liAccepted) : '')
    setLiDms(existing.liDms       != null ? String(existing.liDms)     : '')
    setNotes(existing.notes       ?? '')
    setSaved(true)
  }, [existing])

  // ── derived ───────────────────────────────────────────────────────────────
  const callsN      = parseInt(calls,      10) || 0
  const connectedN  = parseInt(connected,  10) || 0
  const convosN     = parseInt(convos,     10) || 0
  const emailsN     = parseInt(emails,     10) || 0
  const repliesN    = parseInt(replies,    10) || 0
  const liConnectsN = parseInt(liConnects, 10) || 0
  const liAcceptedN = parseInt(liAccepted, 10) || 0
  const liDmsN      = parseInt(liDms,      10) || 0

  const connectRate = pct(connectedN, callsN)
  const convoRate   = pct(convosN,    callsN)
  const replyRate   = pct(repliesN,   emailsN)
  const liAccRate   = pct(liAcceptedN, liConnectsN)

  const xpGain = alreadyXPd.current ? 0
    : XP_VALUES.logOutbound
    + (callsN    > 0 ? 2 : 0)
    + (emailsN   > 0 ? 2 : 0)
    + (liDmsN    > 0 ? 1 : 0)
    + (meetings  > 0 ? 3 : 0)

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)

    await saveOutbound(todayStr, {
      calls:      callsN     || null,
      connected:  connectedN || null,
      convos:     convosN    || null,
      emails:     emailsN    || null,
      replies:    repliesN   || null,
      meetings:   meetings   || null,
      liConnects: liConnectsN || null,
      liAccepted: liAcceptedN || null,
      liDms:      liDmsN     || null,
      notes:      notes.trim() || null,
    })

    if (!alreadyXPd.current) {
      alreadyXPd.current = true

      const [outboundDays, allRecords, totalCheckIns, totalWorkouts,
             totalGoals, completedGoals, totalWeightLogs, totalScans, totalFinanceLogs] =
        await Promise.all([
          db.outbound.count(),
          db.outbound.toArray(),
          db.entries.count(),
          db.workouts.count(),
          db.goals.count(),
          db.goals.filter(g => g.completed).count(),
          db.entries.filter(e => !!e.weight).count(),
          db.scans.count(),
          db.finance.count(),
        ])
      const totalCalls = allRecords.reduce((s, r) => s + (r.calls || 0), 0)

      const { unlockedAchievements } = await awardXP(xpGain, {
        outboundDays, totalCalls,
        totalCheckIns, checkInStreak: 0,
        totalWorkouts, totalGoals, completedGoals,
        totalWeightLogs, totalScans, totalFinanceLogs,
      })
      onXP?.({ amount: xpGain, achievement: unlockedAchievements[0] ?? null })
    }

    setSaved(true)
    setSubmitting(false)
  }

  const drillTier = tierForDrillStreak(salesUx?.drillStreak ?? 0)
  const drillScenario =
    salesUx && scenarioForToday(todayStr, drillTier)

  async function handleDrillSubmit() {
    if (!drill.reply.trim() || drill.loading || !drillScenario) return
    setDrill(d => ({ ...d, loading: true, err: null, coach: null, scores: null, prospectLine: null }))
    try {
      const user = buildObjectionDrillUserMessage({
        scenario: drillScenario.scenario,
        repReply: drill.reply,
        tierLabel: drillScenario.tierLabel,
      })
      const raw = await callClaudeProxy({
        system: OBJECTION_DRILL_SYSTEM,
        messages: [{ role: 'user', content: user }],
        max_tokens: 450,
      })
      const lines = raw.split(/\r?\n/)
      const cut = lines.findIndex((l) => /SCORE_DIRECTNESS:/i.test(l))
      const prospectPart = cut >= 0 ? lines.slice(0, cut).join('\n').trim() : ''
      const parsed = parseDrillReply(raw)
      setDrill(d => ({
        ...d,
        prospectLine: prospectPart || null,
        scores: parsed,
        coach: parsed.coaching || raw.trim(),
      }))

      const ux = await getOrInitSalesUX()
      let newStreak = ux.drillStreak ?? 0
      const last = ux.lastDrillDate
      if (last !== todayStr) {
        if (last === yesterdayStr) newStreak = (ux.drillStreak ?? 0) + 1
        else newStreak = 1
      }

      let xpGranted = 0
      if (ux.lastDrillXpDay !== todayStr) {
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
        await awardXP(XP_VALUES.objectionDrill, {
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
        xpGranted = XP_VALUES.objectionDrill
        onXP?.({ amount: xpGranted, achievement: null })
      }

      await updateSalesUX({
        lastDrillDate: todayStr,
        drillStreak: newStreak,
        ...(xpGranted ? { lastDrillXpDay: todayStr } : {}),
      })
    } catch (e) {
      setDrill(d => ({ ...d, err: e?.message || 'Drill failed' }))
    } finally {
      setDrill(d => ({ ...d, loading: false }))
    }
  }

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">

      {/* header */}
      <div className="mb-4">
        <h1 className="ios-title">
          Outreach log
        </h1>
        <p className="text-[11px] text-realm-faint mt-1">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* streak + xp row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(outboundStreak ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-realm-panel border border-realm-hairline">
            <Flame size={12} className="text-[#fb923c]" />
            <span className="ff-mono text-[12px] text-realm-text tabular-nums">
              {outboundStreak}
            </span>
            <span className="ff-mono text-[10px] text-realm-muted">day streak</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1 px-2.5 py-1.5
          bg-realm-gold/10 border border-realm-gold/25">
          <Zap size={11} className="text-realm-gold" />
          <span className="ff-mono text-[12px] text-realm-gold font-medium">
            {alreadyXPd.current ? 'FILED' : `+${xpGain} XP`}
          </span>
        </div>
      </div>

      {/* ── DRILL (daily objection rep) ── */}
      <div id="outbound-drill" className="mb-6 scroll-mt-4">
        <SectionLabel>Objection drill</SectionLabel>
        {salesUx === undefined ? (
          <p className="ff-mono text-[11px] text-realm-faint">Loading…</p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-realm-panel border border-realm-hairline">
                <Swords size={12} className="text-realm-gold" />
                <span className="ff-mono text-[11px] text-realm-text tabular-nums">
                  {salesUx.drillStreak ?? 0}
                </span>
                <span className="ff-mono text-[10px] text-realm-muted">drill streak</span>
              </div>
              <span className="ff-mono text-[10px] text-realm-muted uppercase tracking-wider">
                Tier {drillTier} · {drillScenario?.tierLabel}
              </span>
              {salesUx.lastDrillXpDay === todayStr && (
                <span className="ff-mono text-[10px] text-[#4ade80] uppercase">+5 XP filed</span>
              )}
            </div>
            <div className="ios-card mb-3">
              <p className="ff-mono text-[11px] text-realm-text-soft leading-relaxed whitespace-pre-wrap uppercase tracking-wide">
                {drillScenario?.scenario}
              </p>
            </div>
            <textarea
              rows={3}
              value={drill.reply}
              onChange={(e) => setDrill(d => ({ ...d, reply: e.target.value }))}
              placeholder="Your reply (spoken)…"
              className="fl-input ff-mono text-[13px] resize-none mb-2"
            />
            <button
              type="button"
              disabled={!drill.reply.trim() || drill.loading}
              onClick={handleDrillSubmit}
              className="w-full py-3 border border-realm-gold/35 text-realm-gold ff-mono text-[11px] uppercase tracking-wider disabled:opacity-30"
            >
              {drill.loading ? 'Sparring…' : 'Spar — +5 XP'}
            </button>
            {drill.err && (
              <p className="ff-mono text-[11px] text-[#f87171] mt-2">{drill.err}</p>
            )}
            {drill.prospectLine && (
              <div className="mt-3 ios-card">
                <p className="ios-label mb-1">Prospect</p>
                <p className="ff-mono text-[12px] text-[#a3a3a3] whitespace-pre-wrap">{drill.prospectLine}</p>
              </div>
            )}
            {drill.scores && (drill.scores.directness || drill.scores.coaching) && (
              <div className="mt-3 ios-card border border-realm-gold/25">
                <p className="ff-mono text-[9px] text-realm-gold uppercase tracking-widest mb-2">Operator</p>
                {(drill.scores.directness || drill.scores.curiosity || drill.scores.nextstep) && (
                  <p className="ff-mono text-[11px] text-realm-text mb-2 tabular-nums">
                    {drill.scores.directness && `Direct ${drill.scores.directness}/10`}
                    {drill.scores.curiosity && ` · Curiosity ${drill.scores.curiosity}/10`}
                    {drill.scores.nextstep && ` · Next step ${drill.scores.nextstep}/10`}
                  </p>
                )}
                {drill.coach && (
                  <p className="ff-mono text-[12px] text-realm-text-soft leading-relaxed">{drill.coach}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* filed banner */}
      {saved && (
        <div className="flex items-center gap-2 mb-5 px-3 py-2
          bg-[#4ade8010] border border-[#4ade8028]">
          <CheckCheck size={12} className="text-[#4ade80] shrink-0" />
          <span className="ff-mono text-[11px] text-[#4ade80] tracking-widest uppercase">
            Log on file — tap to edit
          </span>
        </div>
      )}

      {/* ── MEETINGS BOOKED — hero metric ── */}
      <div className="mb-5">
        <SectionLabel>Meetings Booked</SectionLabel>
        <div
          className="flex items-center justify-between px-5 py-4 border transition-all duration-300"
          style={{
            borderColor:     meetings > 0 ? '#d4a853'   : '#252525',
            backgroundColor: meetings > 0 ? '#d4a85314' : '#161616',
          }}
        >
          <button
            type="button"
            onClick={() => setMeetings(m => Math.max(0, m - 1))}
            className="ff-mono text-2xl text-realm-muted hover:text-realm-gold
              transition-colors w-10 h-10 flex items-center justify-center
              border border-realm-border hover:border-realm-gold/45"
          >
            −
          </button>

          <div className="flex flex-col items-center gap-0.5">
            <span
              className="ff-mono tabular-nums font-medium transition-all duration-200"
              style={{
                fontSize: '3rem',
                lineHeight: 1,
                color: meetings > 0 ? '#d4a853' : '#3a3a3a',
              }}
            >
              {meetings}
            </span>
            <span className="ff-mono text-[10px] uppercase tracking-[0.2em] text-realm-muted">
              booked today
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMeetings(m => m + 1)}
            className="ff-mono text-2xl text-realm-muted hover:text-realm-gold
              transition-colors w-10 h-10 flex items-center justify-center
              border border-realm-border hover:border-realm-gold/45"
          >
            +
          </button>
        </div>
        {meetings > 0 && (
          <p className="ff-mono text-[10px] text-realm-gold mt-1.5 tracking-wider">
            +3 XP bonus for booking
          </p>
        )}
      </div>

      {/* ── PHONE ── */}
      <div className="mb-5">
        <SectionLabel>Phone</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <MetricInput label="Dials"     value={calls}     onChange={setCalls}     />
          <MetricInput label="Connected" value={connected} onChange={setConnected} sub={connectRate} />
          <MetricInput label="Convos"    value={convos}    onChange={setConvos}    sub={convoRate} />
        </div>
        {callsN > 0 && (
          <div className="mt-2 flex gap-3">
            {connectRate != null && (
              <span className="ff-mono text-[10px]" style={{ color: rateColor(connectRate) }}>
                {connectRate}% connect rate
              </span>
            )}
            {convoRate != null && (
              <span className="ff-mono text-[10px]" style={{ color: rateColor(convoRate) }}>
                {convoRate}% convo rate
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── EMAIL ── */}
      <div className="mb-5">
        <SectionLabel>Email</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <MetricInput label="Sent"    value={emails}  onChange={setEmails}  />
          <MetricInput label="Replies" value={replies} onChange={setReplies} sub={replyRate} />
        </div>
        {emailsN > 0 && replyRate != null && (
          <p className="ff-mono text-[10px] mt-2" style={{ color: rateColor(replyRate) }}>
            {replyRate}% reply rate
          </p>
        )}
      </div>

      {/* ── LINKEDIN ── */}
      <div className="mb-5">
        <SectionLabel>LinkedIn</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <MetricInput label="Connects" value={liConnects} onChange={setLiConnects} />
          <MetricInput label="Accepted" value={liAccepted} onChange={setLiAccepted} sub={liAccRate} />
          <MetricInput label="DMs"      value={liDms}      onChange={setLiDms}      />
        </div>
        {liConnectsN > 0 && liAccRate != null && (
          <p className="ff-mono text-[10px] mt-2" style={{ color: rateColor(liAccRate) }}>
            {liAccRate}% acceptance rate
          </p>
        )}
      </div>

      {/* ── WEEKLY ROLLUP ── */}
      {weeklyStats && weeklyStats.days > 0 && (
        <div className="mb-5">
          <SectionLabel>This Week</SectionLabel>
          <div className="ios-group flex divide-x divide-realm-border">
            {[
              { label: 'Days',  value: weeklyStats.days },
              { label: 'Calls', value: weeklyStats.calls },
              { label: 'Convos', value: weeklyStats.convos },
              { label: 'Emails', value: weeklyStats.emails },
              { label: 'Meets',  value: weeklyStats.meetings },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center gap-0.5 flex-1 py-3">
                <span className="ff-mono text-[15px] tabular-nums"
                  style={{ color: (label === 'Meets' && value > 0) ? '#d4a853' : '#e5e5e5' }}>
                  {value}
                </span>
                <span className="ff-mono text-[9px] uppercase tracking-wider text-realm-muted">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NOTES ── */}
      <div className="mb-6">
        <SectionLabel>Notes</SectionLabel>
        <textarea
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Best conversation, pipeline movement, blockers…"
          className="fl-input ff-mono text-[13px] resize-none"
          style={{ padding: '0.6rem 0.75rem' }}
        />
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
          ? 'Saving…'
          : saved
            ? 'Update Log'
            : `Submit Log${xpGain > 0 ? ` — +${xpGain} XP` : ''}`}
      </button>

    </div>
  )
}
