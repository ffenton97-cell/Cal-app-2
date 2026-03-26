import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { format, subDays, parseISO, differenceInCalendarDays } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Phone,
  ListTodo,
  Target,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Crosshair,
  ChevronDown,
  Briefcase,
} from 'lucide-react'
import { db } from '../db'
import { USER } from '../theme'
import PreDialRitualModal from '../components/PreDialRitualModal.jsx'
import { buildWarRoomBrief, loadYesterdayMood, salesOteSnapshot } from '../lib/warRoomBrief.js'
import { pickQuoteContext, pickQuoteForDay } from '../data/salesQuotes.js'
import {
  getOrInitSalesUX,
  maybeResolveEnemyWeek,
  recomputePbWeek,
  enemyTargets,
  updateSalesUX,
} from '../lib/salesUX.js'
import { rankOpenTodosForWeek } from '../lib/todoWeekPrioritize.js'
import { buildDayStructure } from '../lib/dayStructure.js'
import { calcStreak } from '../hooks/useStreaks.js'
import SectionLabel from '../components/SectionLabel'

function DailyBriefing({ todayStr, suggestions }) {
  const scheduled = suggestions.filter((s) => s.kind === 'event' || s.kind === 'gym')
  const actions = suggestions.filter((s) => s.kind !== 'event' && s.kind !== 'gym')
  const dateLine = format(parseISO(`${todayStr}T12:00:00`), 'EEEE, MMMM d')

  return (
    <section className="ea-panel overflow-hidden">
      <div className="px-3.5 pt-3.5 pb-1">
        <div className="flex items-start gap-2.5">
          <Briefcase size={15} className="shrink-0 mt-0.5 text-realm-muted" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <p className="ea-k mb-0.5">Brief</p>
            <p className="ea-h text-[15px]">{dateLine}</p>
            <p className="ea-sub mt-2">
              Clock first. Then moves from tasks, deadlines, and personal dates. No external calendar
              sync — timed blocks live under Calendar → Schedule.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="px-3.5 py-2 ea-k">Clock</div>
        {scheduled.length > 0 ? (
          <ul className="list-none m-0 p-0">
            {scheduled.map((s, i) => {
              const hasTime = Boolean(s.timeLabel && s.timeLabel !== '—')
              return (
                <li
                  key={`${s.kind}-${s.order}-${i}`}
                  className="border-t border-white/[0.06] px-3.5 py-2 flex gap-3"
                >
                  <span className="ea-time shrink-0 w-11 text-right pt-0.5">
                    {hasTime ? s.timeLabel : '—'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="ea-h text-[13px] leading-snug">{s.headline}</p>
                    {s.detail ? <p className="ea-sub mt-1">{s.detail}</p> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="ea-sub px-3.5 pb-3 pt-0 border-t border-white/[0.06]">
            Nothing on the clock. Add blocks under Calendar → Schedule.
          </p>
        )}
      </div>

      {actions.length > 0 && (
        <div className="border-t border-white/[0.06]">
          <div className="px-3.5 py-2 ea-k">Moves</div>
          <ul className="list-none m-0 p-0">
            {actions.map((s, i) => (
              <li
                key={`${s.kind}-${s.order}-a-${i}`}
                className="border-t border-white/[0.06] px-3.5 py-2 flex gap-3"
              >
                <span className="ea-time shrink-0 w-11 block" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="ea-h text-[13px] leading-snug">{s.headline}</p>
                  {s.detail ? <p className="ea-sub mt-1">{s.detail}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-white/[0.06] px-3.5 py-2.5">
        <Link
          href="/datebook#schedule"
          className="ea-sub inline-flex items-center gap-1.5 hover:text-realm-text-soft transition-colors"
        >
          Calendar → Schedule
          <ArrowRight size={12} strokeWidth={2} className="opacity-45" />
        </Link>
      </div>
    </section>
  )
}

function nextPaydays(anchorStr, intervalDays, count = 4) {
  const anchor = parseISO(`${anchorStr}T12:00:00`)
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  let d = new Date(anchor)
  const out = []
  let guard = 0
  while (guard++ < 500 && out.length < count) {
    if (d >= today) {
      out.push(format(d, 'yyyy-MM-dd'))
    }
    d = new Date(d)
    d.setDate(d.getDate() + intervalDays)
  }
  return out
}

const priColor = (p) =>
  ({ HIGH: '#e05070', MED: '#d4a050', LOW: 'rgba(255,255,255,0.22)' }[p] ?? 'rgba(255,255,255,0.22)')


export default function Desk({ onXP }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const [ritualOpen, setRitualOpen] = useState(false)
  const [enemyMsg, setEnemyMsg] = useState(null)
  const [enemyCfgOpen, setEnemyCfgOpen] = useState(false)
  const onXPRef = useRef(onXP)
  onXPRef.current = onXP

  const salesBlock = useLiveQuery(async () => {
    const days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'))
    const records = await Promise.all(days.map((d) => db.outbound.get(d)))
    const live = records.filter(Boolean)
    const [streak, trainingStreak, gymStreak] = await Promise.all([
      calcStreak('outbound'),
      calcStreak('workouts'),
      calcStreak('entries', 'gym'),
    ])
    const todayRow = await db.outbound.get(todayStr)
    const yRow = await db.outbound.get(yesterdayStr)
    const salesGoals = await db.goals
      .filter((g) => !g.completed && (g.category || '').toLowerCase().includes('sales'))
      .toArray()
    const ux = await getOrInitSalesUX()
    const yesterdayMood = await loadYesterdayMood()
    const weekCalls = live.reduce((s, r) => s + (r.calls || 0), 0)
    const weekMeetings = live.reduce((s, r) => s + (r.meetings || 0), 0)
    const defaultDialTarget = Math.max(20, Math.round((weekCalls / 7) * 1.1) || 20)
    const brief = buildWarRoomBrief({
      campaignStartDate: ux.campaignStartDate ?? todayStr,
      todayStr,
      salesGoals,
      weekCalls,
      weekMeetings,
      yesterdayMood,
      gymStreak,
      outboundStreak: streak,
      defaultDialTarget,
      trainingStreak,
    })
    const { behindOte } = salesOteSnapshot(salesGoals)
    const hadMeetingYesterday = (yRow?.meetings ?? 0) > 0
    const quoteCategory = pickQuoteContext({
      behindOte,
      gymStreak,
      outboundStreak: streak,
      yesterdayMood,
      hadMeetingYesterday,
    })
    const quote = pickQuoteForDay(quoteCategory, todayStr)
    const enemy = enemyTargets(ux)
    return {
      week: {
        days: live.length,
        calls: weekCalls,
        meetings: weekMeetings,
        convos: live.reduce((s, r) => s + (r.convos || 0), 0),
      },
      streak,
      todayRow,
      salesGoals,
      ux,
      brief,
      quote,
      quoteCategory,
      defaultDialTarget,
      enemy,
    }
  }, [todayStr, yesterdayStr])

  const dayPlan = useLiveQuery(async () => buildDayStructure(todayStr), [todayStr])

  const taskBlock = useLiveQuery(async () => {
    const all = await db.todos.filter((t) => !t.done).toArray()
    const overdue = all.filter((t) => t.due && t.due < todayStr)
    const today = all.filter((t) => t.due === todayStr)
    const soon = all
      .filter((t) => t.due && t.due > todayStr)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 8)
    const { ranked } = rankOpenTodosForWeek(all, new Date())
    return { overdue, today, soon, totalOpen: all.length, weeklyPreview: ranked.slice(0, 12) }
  }, [todayStr])

  const paydays = nextPaydays(USER.paydayAnchor, USER.paydayInterval, 4)

  useEffect(() => {
    let cancelled = false
    recomputePbWeek()
    ;(async () => {
      const res = await maybeResolveEnemyWeek((p) => onXPRef.current?.(p))
      if (cancelled || !res?.defeated) return
      setEnemyMsg('Benchmark beaten — +25 XP. Next week’s target moves to last week’s numbers.')
      window.setTimeout(() => setEnemyMsg(null), 8000)
    })()
    return () => {
      cancelled = true
    }
  }, [todayStr])

  async function fileQuote(q) {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `arm-${Date.now()}`
    await db.armoury.put({
      id,
      text: q.text,
      author: q.author,
      category: q.category,
      filedAt: Date.now(),
      deskDate: todayStr,
    })
  }

  const sessionActive =
    salesBlock?.ux?.sessionDay === todayStr && salesBlock?.ux?.sessionStartedAt
  const dialTarget = salesBlock?.ux?.sessionDialTarget
  const todayCalls = salesBlock?.todayRow?.calls ?? 0

  const [sessionTick, setSessionTick] = useState(0)
  useEffect(() => {
    if (!sessionActive || !salesBlock?.ux?.sessionStartedAt) return
    const id = window.setInterval(() => setSessionTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [sessionActive, salesBlock?.ux?.sessionStartedAt])

  let campaignDay = 1
  if (salesBlock?.ux?.campaignStartDate) {
    try {
      const d =
        differenceInCalendarDays(
          parseISO(`${todayStr}T12:00:00`),
          parseISO(`${salesBlock.ux.campaignStartDate}T12:00:00`)
        ) + 1
      if (Number.isFinite(d) && d > 0) campaignDay = d
    } catch {
      /* keep 1 */
    }
  }

  const sessionElapsedSec =
    sessionActive && salesBlock?.ux?.sessionStartedAt
      ? Math.floor((Date.now() - salesBlock.ux.sessionStartedAt) / 1000)
      : 0
  void sessionTick
  const sessionTimerLabel = `${String(Math.floor(sessionElapsedSec / 60)).padStart(2, '0')}:${String(sessionElapsedSec % 60).padStart(2, '0')}`

  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto space-y-8">

      <div>
        <h1 className="ff-heading text-[22px] font-bold text-realm-text tracking-tight leading-none">
          {sessionActive ? (
            <span className="text-realm-gold">Session active</span>
          ) : (
            'Home'
          )}
        </h1>
        {sessionActive ? (
          <p className="ff-mono text-[11px] text-realm-gold mt-1 tracking-wide">
            Day {campaignDay} · session {sessionTimerLabel}
          </p>
        ) : null}
      </div>

      {enemyMsg && (
        <div className="border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] text-[rgba(255,255,255,0.55)]">
          {enemyMsg}
        </div>
      )}

      {/* Daily brief */}
      {salesBlock === undefined ? (
        <p className="forge-mono text-[10px] text-[rgba(255,255,255,0.18)]">loading brief…</p>
      ) : (
        <section className="realm-banner rounded-lg px-3 py-3">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={14} className="shrink-0 text-realm-gold" />
            <span className="forge-mono text-[9px] uppercase tracking-[0.1em] text-[rgba(255,255,255,0.12)]">
              Signal
            </span>
          </div>
          <p className="text-[12.5px] font-normal leading-[1.65] text-[rgba(255,255,255,0.55)] whitespace-pre-wrap">
            {salesBlock.brief}
          </p>
        </section>
      )}

      {/* Quote of the day */}
      {salesBlock && (
        <button
          type="button"
          onClick={() => fileQuote(salesBlock.quote)}
          className="w-full text-left border border-realm-border bg-realm-panel px-3 py-4 rounded-lg active:border-realm-gold/45 transition-colors group"
        >
          <p className="text-[12.5px] font-normal leading-[1.65] text-[rgba(255,255,255,0.55)] whitespace-pre-wrap">
            &ldquo;{salesBlock.quote.text}&rdquo;
          </p>
          <p className="mt-3 text-right text-[10px] text-[rgba(255,255,255,0.32)]">— {salesBlock.quote.author}</p>
          <p className="forge-mono mt-2 text-[9px] tracking-[0.06em] text-[rgba(224,80,112,0.6)] group-hover:text-realm-gold">
            ↗ save → Journal / Quotes
          </p>
        </button>
      )}

      {/* Daily briefing — FORGE operator voice */}
      {dayPlan && dayPlan.suggestions?.length > 0 && (
        <DailyBriefing todayStr={todayStr} suggestions={dayPlan.suggestions} />
      )}

      {/* Session */}
      {salesBlock && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setRitualOpen(true)}
            className="w-full rounded-[7px] border border-[rgba(220,60,80,0.18)] bg-[rgba(220,60,80,0.07)] py-3.5 text-[12px] font-medium text-realm-gold transition-colors duration-150 ease-out hover:bg-[rgba(220,60,80,0.1)]"
          >
            Start outreach session
          </button>
          {sessionActive && (
            <div className="ff-mono text-[10px] text-realm-muted px-1 space-y-0.5">
              <p>
                Intention:{' '}
                <span className="text-realm-soft">{salesBlock.ux.sessionIntention || '—'}</span>
              </p>
              {dialTarget != null && (
                <p className="text-realm-gold tabular-nums">
                  Live dials: {todayCalls} / {dialTarget}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <PreDialRitualModal
        open={ritualOpen}
        onClose={() => setRitualOpen(false)}
        defaultDialTarget={salesBlock?.defaultDialTarget ?? 20}
        onXP={onXP}
      />

      {/* ── Sales ── */}
      <section>
        <SectionLabel>Outreach</SectionLabel>

        {salesBlock === undefined ? (
          <p className="ff-mono text-[11px] text-realm-faint">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="border border-realm-border bg-realm-panel px-3 py-3">
                <p className="ff-mono text-[9px] text-realm-muted uppercase tracking-widest mb-1">7-day</p>
                <p
                  className={`ff-mono text-xl tabular-nums ${
                    sessionActive ? 'text-realm-sage' : 'text-realm-text'
                  }`}
                >
                  {salesBlock.week.calls}
                </p>
                <p className="ff-mono text-[9px] text-realm-faint mt-0.5">calls</p>
              </div>
              <div className="border border-realm-border bg-realm-panel px-3 py-3">
                <p className="ff-mono text-[9px] text-realm-muted uppercase tracking-widest mb-1">Meetings</p>
                <p
                  className={`ff-mono text-xl tabular-nums ${
                    sessionActive ? 'text-realm-sage' : 'text-realm-gold-hot'
                  }`}
                >
                  {salesBlock.week.meetings}
                </p>
                <p className="ff-mono text-[9px] text-realm-faint mt-0.5">rolling week</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3 px-3 py-2 border border-realm-border bg-realm-bg-mid">
              <TrendingUp size={14} className="text-realm-arcane shrink-0" />
              <span className="ff-mono text-[11px] text-realm-soft">
                Log streak:{' '}
                <span className="text-realm-text tabular-nums">{salesBlock.streak}</span> days
              </span>
            </div>

            {salesBlock.todayRow && (
              <div className="border border-realm-hairline bg-realm-panel px-3 py-2 mb-3 ff-mono text-[11px] text-realm-soft">
                <span className="text-realm-muted uppercase text-[9px] tracking-wider">Today logged</span>
                <p className="text-realm-text mt-1">
                  {salesBlock.todayRow.calls ?? 0} calls · {salesBlock.todayRow.meetings ?? 0} meetings ·{' '}
                  {salesBlock.todayRow.convos ?? 0} convos
                </p>
              </div>
            )}

            {salesBlock.salesGoals.length > 0 && (
              <div className="space-y-2 mb-3">
                {salesBlock.salesGoals.slice(0, 3).map((g) => (
                  <div key={g.id} className="flex justify-between gap-2 border-l-2 border-realm-gold/35 pl-3 py-1">
                    <span className="ff-mono text-[12px] text-realm-text-soft truncate">{g.title}</span>
                    <span className="ff-mono text-[10px] text-realm-muted tabular-nums shrink-0">
                      {g.current ?? '—'} / {g.target}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Benchmark scoreboard */}
            {salesBlock.ux.enemyBoardEnabled !== false && (
              <div className="border border-realm-ember/35 bg-realm-ember/5 rounded-lg px-3 py-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crosshair size={14} className="text-realm-ember shrink-0" />
                    <span className="ff-heading text-[9px] tracking-[0.15em] text-realm-ember uppercase">
                      Benchmark
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSalesUX({ enemyBoardEnabled: false })}
                    className="ff-mono text-[9px] text-realm-muted uppercase"
                  >
                    Hide
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 ff-mono text-[11px]">
                  <div>
                    <p className="text-[9px] text-realm-muted uppercase mb-1">Your week</p>
                    <p className="text-realm-text tabular-nums">Dials: {salesBlock.week.calls}</p>
                    <p className="text-realm-text tabular-nums">Mtgs: {salesBlock.week.meetings}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-realm-ember uppercase mb-1">
                      {salesBlock.ux.enemyName || 'Target'}
                    </p>
                    <p className="text-realm-ember/90 tabular-nums">Dials: {salesBlock.enemy.dials}</p>
                    <p className="text-realm-ember/90 tabular-nums">Mtgs: {salesBlock.enemy.meetings}</p>
                  </div>
                </div>
                <p className="ff-mono text-[9px] text-realm-muted mt-2 uppercase tracking-wider">
                  Mode:{' '}
                  {salesBlock.ux.enemyMode === 'personal_best'
                    ? 'Personal best (rolling)'
                    : 'Fixed target'}
                </p>
                <button
                  type="button"
                  onClick={() => setEnemyCfgOpen((o) => !o)}
                  className="mt-2 flex items-center gap-1 ff-mono text-[9px] text-realm-muted uppercase"
                >
                  <ChevronDown size={12} className={enemyCfgOpen ? 'rotate-180' : ''} />
                  Configure
                </button>
                {enemyCfgOpen && (
                  <EnemyConfigForm ux={salesBlock.ux} />
                )}
              </div>
            )}
            {salesBlock.ux.enemyBoardEnabled === false && (
              <button
                type="button"
                onClick={() => updateSalesUX({ enemyBoardEnabled: true })}
                className="w-full mb-3 py-2 border border-realm-border ff-mono text-[10px] text-realm-muted uppercase"
              >
                Show benchmark
              </button>
            )}

            <div className="flex flex-col gap-2">
              <Link
                href="/outbound"
                className="flex items-center justify-center gap-2 w-full py-3 border border-realm-gold/35 text-realm-gold ff-mono text-[11px] uppercase tracking-wider"
              >
                <Phone size={16} strokeWidth={1.8} />
                Log outreach
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/outbound#outbound-drill"
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-realm-border text-realm-soft ff-mono text-[10px] uppercase tracking-wider"
              >
                Objection drill — +5 XP
              </Link>
            </div>
          </>
        )}
      </section>

      {/* ── Tasks ── */}
      <section>
        <SectionLabel>Tasks</SectionLabel>

        {taskBlock === undefined ? (
          <p className="ff-mono text-[11px] text-realm-faint">Loading…</p>
        ) : (
          <>
            <div className="flex gap-3 mb-3 text-center">
              <div className="flex-1 border border-realm-border py-2">
                <p className="ff-mono text-2xl text-realm-ember tabular-nums">{taskBlock.overdue.length}</p>
                <p className="ff-mono text-[9px] text-realm-muted uppercase">Overdue</p>
              </div>
              <div className="flex-1 border border-realm-border py-2">
                <p className="ff-mono text-2xl text-realm-gold tabular-nums">{taskBlock.today.length}</p>
                <p className="ff-mono text-[9px] text-realm-muted uppercase">Today</p>
              </div>
              <div className="flex-1 border border-realm-border py-2">
                <p className="ff-mono text-2xl text-realm-text tabular-nums">{taskBlock.totalOpen}</p>
                <p className="ff-mono text-[9px] text-realm-muted uppercase">Open</p>
              </div>
            </div>

            <p className="ff-mono text-[9px] text-realm-muted uppercase tracking-wider mb-2">
              This week (auto-ranked)
            </p>
            <div className="space-y-0 border border-realm-border divide-y divide-realm-hairline mb-3">
              {(taskBlock.weeklyPreview ?? []).length === 0 ? (
                <p className="ff-mono text-[11px] text-realm-faint px-3 py-4 text-center">No open tasks</p>
              ) : (
                (taskBlock.weeklyPreview ?? []).map((row, i) => {
                  const t = row.todo
                  return (
                    <div key={t.id} className="flex items-start gap-2 px-3 py-2.5">
                      <span className="ff-mono text-[9px] text-realm-gold tabular-nums w-4 shrink-0 pt-0.5">
                        {i + 1}
                      </span>
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{ background: priColor(t.priority) }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="ff-mono text-[12px] text-realm-text truncate">{t.title}</p>
                        <p className="ff-mono text-[9px] text-realm-muted mt-0.5">
                          {t.due
                            ? `${t.due}${t.due < todayStr ? ' · overdue' : t.due === todayStr ? ' · due today' : ''}`
                            : 'No due date'}
                          {t.category ? ` · ${t.category}` : ''}
                        </p>
                        {row.hints?.length > 0 && (
                          <p className="ff-mono text-[8px] text-realm-faint mt-0.5">{row.hints.join(' · ')}</p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <Link
              href="/todos#week-focus"
              className="flex items-center justify-center gap-2 w-full py-3 border border-realm-border text-realm-soft hover:text-realm-gold hover:border-realm-gold/35 ff-mono text-[11px] uppercase tracking-wider transition-colors"
            >
              <ListTodo size={16} strokeWidth={1.8} />
              All tasks
              <ArrowRight size={14} />
            </Link>
          </>
        )}
      </section>

      {/* ── Quick: paydays ── */}
      <section>
        <SectionLabel>Pay schedule</SectionLabel>
        <p className="ff-mono text-[10px] text-realm-muted mb-2 uppercase tracking-wider">
          Next pay dates (from your anchor)
        </p>
        <div className="flex flex-wrap gap-2">
          {paydays.map((d) => (
            <span
              key={d}
              className="ff-mono text-[11px] px-2.5 py-1 border border-realm-border text-realm-soft tabular-nums"
            >
              {format(parseISO(`${d}T12:00:00`), 'EEE d MMM')}
            </span>
          ))}
        </div>
        <Link
          href="/goals"
          className="inline-flex items-center gap-2 mt-3 ff-mono text-[10px] text-realm-muted uppercase tracking-wider hover:text-realm-gold"
        >
          <Target size={12} />
          Goals
          <ArrowRight size={12} />
        </Link>
      </section>
    </div>
  )
}

function EnemyConfigForm({ ux }) {
  const [name, setName] = useState(ux.enemyName || 'Bench')
  const [dials, setDials] = useState(String(ux.enemyBenchDials ?? 55))
  const [mtgs, setMtgs] = useState(String(ux.enemyBenchMeetings ?? 3))
  const [mode, setMode] = useState(ux.enemyMode || 'benchmark')

  return (
    <div className="mt-3 space-y-2 border border-realm-border p-2 bg-realm-bg-mid">
      <label className="block ff-mono text-[9px] text-realm-muted uppercase">Benchmark label</label>
      <input className="fl-input py-2 text-[12px]" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="block ff-mono text-[9px] text-realm-muted uppercase">Benchmark dials / mtgs (week)</label>
      <div className="grid grid-cols-2 gap-2">
        <input className="fl-input py-2" value={dials} onChange={(e) => setDials(e.target.value)} inputMode="numeric" />
        <input className="fl-input py-2" value={mtgs} onChange={(e) => setMtgs(e.target.value)} inputMode="numeric" />
      </div>
      <div className="flex gap-2 ff-mono text-[10px]">
        <label className="flex items-center gap-1 text-realm-soft">
          <input
            type="radio"
            name="emode"
            checked={mode === 'benchmark'}
            onChange={() => setMode('benchmark')}
          />
          Benchmark
        </label>
        <label className="flex items-center gap-1 text-realm-soft">
          <input
            type="radio"
            name="emode"
            checked={mode === 'personal_best'}
            onChange={() => setMode('personal_best')}
          />
          Personal best
        </label>
      </div>
      <button
        type="button"
        onClick={() => {
          updateSalesUX({
            enemyName: name.trim() || 'Bench',
            enemyBenchDials: Math.max(1, parseInt(dials, 10) || 55),
            enemyBenchMeetings: Math.max(0, parseInt(mtgs, 10) || 0),
            enemyMode: mode,
          })
          recomputePbWeek()
        }}
        className="w-full py-2 border border-realm-gold/35 text-realm-gold ff-mono text-[10px] uppercase"
      >
        Save
      </button>
    </div>
  )
}
