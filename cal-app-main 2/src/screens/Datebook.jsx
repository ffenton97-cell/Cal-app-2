import { useState } from 'react'
import Link from 'next/link'
import { format, parseISO, addDays } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ListTodo,
  Target,
  DollarSign,
  CalendarClock,
  ArrowRight,
  Heart,
  Trash2,
  Plus,
} from 'lucide-react'
import { db } from '../db'
import { USER } from '../theme'
import { importantDateToTimelineItem, uid } from '../lib/importantDates.js'
import { timeInputToStartMin } from '../lib/dayStructure.js'
import { nextPaydays } from '../lib/paydays.js'
import SectionLabel from '../components/SectionLabel'

/**
 * Upcoming & important dates — no full calendar.
 */
export default function Datebook() {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const horizonEnd = format(addDays(new Date(), 120), 'yyyy-MM-dd')
  const personalOneOffHorizon = format(addDays(new Date(), 540), 'yyyy-MM-dd')

  const [title, setTitle] = useState('')
  const [datePick, setDatePick] = useState('')
  const [everyYear, setEveryYear] = useState(true)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const [evDate, setEvDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [evTime, setEvTime] = useState('09:00')
  const [evTitle, setEvTitle] = useState('')
  const [evNotes, setEvNotes] = useState('')
  const [evSaving, setEvSaving] = useState(false)

  const timedHorizonEnd = format(addDays(new Date(), 60), 'yyyy-MM-dd')

  const timedPlans = useLiveQuery(
    async () => {
      const all = await db.dayEvents.toArray()
      return all
        .filter((e) => e.date >= todayStr && e.date <= timedHorizonEnd)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.startMin ?? 0) - (b.startMin ?? 0))
    },
    [todayStr, timedHorizonEnd]
  )

  const rows = useLiveQuery(async () => {
    const [todos, goals, personalRows, scans, finance] = await Promise.all([
      db.todos.filter((t) => !t.done && t.due).toArray(),
      db.goals.filter((g) => !g.completed && g.deadline).toArray(),
      db.importantDates.toArray(),
      db.scans.orderBy('date').reverse().limit(1).toArray(),
      db.finance.orderBy('date').reverse().limit(1).toArray(),
    ])

    const items = []

    for (const row of personalRows) {
      const mapped = importantDateToTimelineItem(row, todayStr, personalOneOffHorizon)
      if (mapped) items.push(mapped)
    }

    for (const t of todos) {
      if (t.due <= horizonEnd || t.due < todayStr) {
        items.push({
          sort: t.due,
          date: t.due,
          kind: 'task',
          title: t.title,
          sub: t.category || t.priority,
          id: `todo-${t.id}`,
          overdue: t.due < todayStr,
        })
      }
    }

    for (const g of goals) {
      if (g.deadline <= horizonEnd || g.deadline < todayStr) {
        items.push({
          sort: g.deadline,
          date: g.deadline,
          kind: 'goal',
          title: g.title,
          sub: g.unit ? `${g.current ?? '—'} → ${g.target} ${g.unit}` : g.category,
          id: `goal-${g.id}`,
          overdue: g.deadline < todayStr,
        })
      }
    }

    const paydays = nextPaydays(USER.paydayAnchor, USER.paydayInterval, 6)
    for (const d of paydays) {
      items.push({
        sort: d,
        date: d,
        kind: 'payday',
        title: 'Payday check',
        sub: 'Fortnightly cadence',
        id: `pay-${d}`,
        overdue: false,
      })
    }

    const reference = []

    if (scans[0]?.date) {
      const last = scans[0].date
      reference.push({
        sort: last,
        date: last,
        kind: 'scan',
        title: 'Last body scan',
        sub: scans[0].bf != null ? `${scans[0].bf}% BF` : 'Logged',
        id: `scan-${last}`,
        overdue: false,
      })
    }

    if (finance[0]?.date) {
      const fd = finance[0].date
      reference.push({
        sort: fd,
        date: fd,
        kind: 'finance',
        title: 'Last finance snapshot',
        sub: finance[0].netWorth != null ? `Net ${finance[0].netWorth}` : 'Logged',
        id: `fin-${fd}`,
        overdue: false,
      })
    }

    items.sort((a, b) => a.sort.localeCompare(b.sort))
    reference.sort((a, b) => b.sort.localeCompare(a.sort))
    return { timeline: items, reference }
  }, [todayStr, horizonEnd, personalOneOffHorizon])

  const timeline = rows?.timeline ?? []
  const pastRef = rows?.reference ?? []

  const overdue = timeline.filter((r) => r.overdue)
  const upcoming = timeline.filter((r) => !r.overdue && r.date >= todayStr)

  async function handleAddPersonal(e) {
    e.preventDefault()
    if (!title.trim() || !datePick) return
    const [y, m, d] = datePick.split('-').map(Number)
    if (!y || !m || !d) return
    setSaving(true)
    try {
      await db.importantDates.put({
        id: uid(),
        title: title.trim(),
        month: m,
        day: d,
        year: everyYear ? null : y,
        notes: notes.trim() || undefined,
        created: todayStr,
      })
      setTitle('')
      setDatePick('')
      setNotes('')
      setEveryYear(true)
    } finally {
      setSaving(false)
    }
  }

  async function deletePersonal(id) {
    await db.importantDates.delete(id)
  }

  function formatStartMin(m) {
    const mm = typeof m === 'number' ? m : 0
    const h = Math.floor(mm / 60)
    const mins = mm % 60
    return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  async function handleAddTimed(e) {
    e.preventDefault()
    if (!evTitle.trim() || !evDate || evSaving) return
    setEvSaving(true)
    try {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `evt_${Date.now()}`
      await db.dayEvents.add({
        id,
        date: evDate,
        startMin: timeInputToStartMin(evTime),
        title: evTitle.trim(),
        notes: evNotes.trim() || undefined,
        created: new Date().toISOString(),
      })
      setEvTitle('')
      setEvNotes('')
    } finally {
      setEvSaving(false)
    }
  }

  async function deleteTimed(id) {
    await db.dayEvents.delete(id)
  }

  const kindIcon = (k) => {
    switch (k) {
      case 'task':
        return ListTodo
      case 'goal':
        return Target
      case 'payday':
        return DollarSign
      case 'personal':
        return Heart
      default:
        return CalendarClock
    }
  }

  const kindColor = (k) => {
    switch (k) {
      case 'task':
        return '#d4a853'
      case 'goal':
        return '#4ade80'
      case 'payday':
        return '#60a5fa'
      case 'personal':
        return '#f472b6'
      case 'scan':
        return '#22d3ee'
      case 'finance':
        return '#fbbf24'
      default:
        return '#525252'
    }
  }

  function RowCard({ item }) {
    const Icon = kindIcon(item.kind)
    const col = kindColor(item.kind)
    const d = parseISO(`${item.date}T12:00:00`)
    return (
      <div
        className="flex items-start gap-3 px-3 py-2.5 border-b border-realm-hairline last:border-0"
        style={{ borderLeft: `2px solid ${col}` }}
      >
        <Icon size={16} strokeWidth={1.8} className="shrink-0 mt-0.5" style={{ color: col }} />
        <div className="min-w-0 flex-1">
          <p className="ios-label tabular-nums">
            {format(d, 'EEE d MMM yyyy')}
            {item.overdue && <span className="text-[#f87171] ml-2">Overdue</span>}
          </p>
          <p className="ff-mono text-[13px] text-realm-text mt-0.5">{item.title}</p>
          {item.sub && (
            <p className="ff-mono text-[10px] text-realm-muted mt-0.5">{item.sub}</p>
          )}
        </div>
        {item.personalId && (
          <button
            type="button"
            onClick={() => deletePersonal(item.personalId)}
            className="shrink-0 p-1.5 text-realm-faint hover:text-[#f87171] border border-transparent hover:border-[#f8717140]"
            aria-label={`Remove ${item.title}`}
          >
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">

      <div className="mb-6">
        <h1 className="ios-title">
          Calendar
        </h1>
        <p className="text-[12.5px] text-[rgba(255,255,255,0.32)] mt-1">
          Deadlines, personal dates, timed blocks
        </p>
      </div>

      <section className="mb-8">
        <SectionLabel>Personal dates</SectionLabel>
        <p className="mb-3 text-[11px] leading-relaxed text-[rgba(255,255,255,0.32)]">
          One-off or annual (month/day). Toggle every year for recurring.
        </p>
        <form
          onSubmit={handleAddPersonal}
          className="ios-card space-y-3"
        >
          <div>
            <label className="ios-label block mb-1">
              Label
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sarah’s birthday, Valentine’s Day"
              className="fl-input"
            />
          </div>
          <div>
            <label className="ios-label block mb-1">
              Date
            </label>
            <input
              type="date"
              value={datePick}
              onChange={(e) => setDatePick(e.target.value)}
              className="fl-input"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer ff-mono text-[11px] text-realm-soft">
            <input
              type="checkbox"
              checked={everyYear}
              onChange={(e) => setEveryYear(e.target.checked)}
              className="accent-realm-gold"
            />
            Every year (same month and day)
          </label>
          <div>
            <label className="ios-label block mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gift ideas, dinner booking…"
              className="fl-input"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !title.trim() || !datePick}
            className="flex w-full items-center justify-center gap-2 rounded-[7px] border border-[rgba(220,60,80,0.18)] bg-[rgba(220,60,80,0.07)] py-3 text-[12px] font-medium text-realm-gold disabled:opacity-30"
          >
            <Plus size={16} strokeWidth={1.8} />
            {saving ? 'Saving…' : 'Add'}
          </button>
        </form>
      </section>

      <section id="schedule" className="mb-8 scroll-mt-4 rounded-[12px] bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.07)] overflow-hidden">
        <div className="px-3.5 pt-3.5 pb-2">
          <h2 className="text-[14px] font-semibold tracking-tight text-[#f5f0f0]">Schedule</h2>
          <p className="text-[13px] text-[rgba(255,255,255,0.5)] leading-[1.55] mt-1.5">
            Timed items surface first on Home brief. On-device only — no Google or device calendar
            feed.
          </p>
        </div>
        <form
          onSubmit={handleAddTimed}
          className="px-3.5 pb-3.5 border-t border-white/[0.06] pt-3 space-y-2.5"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="ios-label block mb-1">Date</label>
              <input
                type="date"
                value={evDate}
                onChange={(e) => setEvDate(e.target.value)}
                className="fl-input text-[13px]"
              />
            </div>
            <div>
              <label className="ios-label block mb-1">Start</label>
              <input
                type="time"
                value={evTime}
                onChange={(e) => setEvTime(e.target.value)}
                className="fl-input text-[13px]"
              />
            </div>
          </div>
          <div>
            <label className="ios-label block mb-1">Subject</label>
            <input
              type="text"
              value={evTitle}
              onChange={(e) => setEvTitle(e.target.value)}
              placeholder="e.g. Pipeline review, Gym, Focus block"
              className="fl-input text-[13px]"
            />
          </div>
          <div>
            <label className="ios-label block mb-1">Details (optional)</label>
            <input
              type="text"
              value={evNotes}
              onChange={(e) => setEvNotes(e.target.value)}
              placeholder="Dial-in, room, prep"
              className="fl-input text-[13px]"
            />
          </div>
          <button
            type="submit"
            disabled={evSaving || !evTitle.trim() || !evDate}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-[12px] font-medium text-realm-text-soft bg-white/[0.08] border border-white/[0.08] hover:bg-white/[0.11] disabled:opacity-35 transition-colors"
          >
            <Plus size={15} strokeWidth={2} />
            {evSaving ? 'Saving…' : 'Add to schedule'}
          </button>
        </form>
        <div className="border-t border-white/[0.06]">
          {timedPlans === undefined ? (
            <p className="text-[13px] text-[rgba(255,255,255,0.5)] leading-[1.55] px-3.5 py-3">Loading…</p>
          ) : timedPlans.length === 0 ? (
            <p className="text-[13px] text-[rgba(255,255,255,0.5)] leading-[1.55] px-3.5 py-3">No entries in the next 60 days.</p>
          ) : (
            <ul className="list-none m-0 p-0">
              {timedPlans.map((ev) => {
                const d = parseISO(`${ev.date}T12:00:00`)
                return (
                  <li
                    key={ev.id}
                    className="flex items-start gap-3 px-3.5 py-2.5 border-t border-white/[0.06] first:border-t-0"
                  >
                    <div className="ff-mono text-[11px] text-[rgba(255,255,255,0.32)] tabular-nums shrink-0 w-14 pt-0.5 text-right leading-tight">
                      <span className="block text-realm-text-soft text-[12px] font-medium">
                        {format(d, 'EEE d MMM')}
                      </span>
                      <span className="block tabular-nums mt-0.5">{formatStartMin(ev.startMin)}</span>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[13px] font-semibold tracking-tight text-[#f5f0f0] leading-snug">{ev.title}</p>
                      {ev.notes ? <p className="text-[13px] text-[rgba(255,255,255,0.5)] leading-[1.55] mt-0.5">{ev.notes}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteTimed(ev.id)}
                      className="shrink-0 p-1.5 text-realm-faint hover:text-red-400/90 rounded transition-colors"
                      aria-label={`Remove ${ev.title}`}
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {rows === undefined ? (
        <p className="ff-mono text-[11px] text-realm-faint">Loading…</p>
      ) : (
        <>
          {overdue.length > 0 && (
            <section className="mb-8">
              <SectionLabel>Overdue</SectionLabel>
              <div className="ios-group">
                {overdue.map((item) => (
                  <RowCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          <section className="mb-8">
            <SectionLabel>Window</SectionLabel>
            {upcoming.length === 0 && overdue.length === 0 ? (
              <p className="ff-mono text-[11px] text-[#2a2a2a] uppercase tracking-widest py-6 text-center border border-realm-hairline leading-relaxed px-2">
                Nothing in the next ~4 months — add your dates above, or tasks / goals with
                deadlines
              </p>
            ) : upcoming.length === 0 ? (
              <p className="ff-mono text-[11px] text-[#2a2a2a] py-4">Nothing scheduled ahead.</p>
            ) : (
              <div className="ios-group">
                {upcoming.map((item) => (
                  <RowCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>

          {pastRef.length > 0 && (
            <section className="mb-6">
              <SectionLabel>Recent reference</SectionLabel>
              <div className="ios-group opacity-90">
                {pastRef.map((item) => (
                  <RowCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/todos"
              className="ff-mono text-[10px] text-realm-muted uppercase tracking-wider flex items-center gap-1 hover:text-realm-gold"
            >
              Todos <ArrowRight size={12} />
            </Link>
            <Link
              href="/goals"
              className="ff-mono text-[10px] text-realm-muted uppercase tracking-wider flex items-center gap-1 hover:text-realm-gold"
            >
              Goals <ArrowRight size={12} />
            </Link>
            <Link
              href="/desk"
              className="ff-mono text-[10px] text-realm-muted uppercase tracking-wider flex items-center gap-1 hover:text-realm-gold"
            >
              Home <ArrowRight size={12} />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
