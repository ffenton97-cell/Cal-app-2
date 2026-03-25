import { format, parseISO, addDays, getDay } from 'date-fns'
import { db } from '../db'
import { USER, GYM_SCHEDULE } from '../theme'
import { importantDateToTimelineItem } from './importantDates.js'
import { rankOpenTodosForWeek } from './todoWeekPrioritize.js'

const PRI_ORDER = { HIGH: 0, MED: 1, LOW: 2 }

function sortByPriority(a, b) {
  return (PRI_ORDER[a.priority] ?? 1) - (PRI_ORDER[b.priority] ?? 1)
}

function nextPaydays(anchorStr, intervalDays, count = 12) {
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

function isPaydayToday(todayStr) {
  return nextPaydays(USER.paydayAnchor, USER.paydayInterval, 24).includes(todayStr)
}

function timeStrToMin(hhmm) {
  const [h, m] = String(hhmm || '0:0').split(':').map((x) => parseInt(x, 10) || 0)
  return Math.min(1439, Math.max(0, h * 60 + m))
}

function minToLabel(m) {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/**
 * Ordered suggestions for shaping today: timed blocks, tasks, goals, personal dates, payday, gym.
 * Calendar invites are approximated via `dayEvents` (user-entered) on Dates.
 *
 * @param {string} todayStr — yyyy-MM-dd
 * @returns {Promise<{ suggestions: Array<{ order: number, timeLabel: string | null, headline: string, detail: string | null, kind: string }> }>}
 */
export async function buildDayStructure(todayStr) {
  const ref = parseISO(`${todayStr}T12:00:00`)
  const dow = getDay(ref)
  const personalHorizon = format(addDays(ref, 540), 'yyyy-MM-dd')

  const [todosOpen, goals, personalRows, dayEvents] = await Promise.all([
    db.todos.filter((t) => !t.done).toArray(),
    db.goals.filter((g) => !g.completed && g.deadline === todayStr).toArray(),
    db.importantDates.toArray(),
    db.dayEvents.where('date').equals(todayStr).toArray(),
  ])

  const overdue = todosOpen.filter((t) => t.due && t.due < todayStr)
  const dueToday = todosOpen.filter((t) => t.due === todayStr)
  overdue.sort(sortByPriority)
  dueToday.sort(sortByPriority)

  const onThisDay = []
  for (const row of personalRows) {
    const it = importantDateToTimelineItem(row, todayStr, personalHorizon)
    if (it && it.date === todayStr) onThisDay.push(it)
  }

  const hasGymLikeEvent = dayEvents.some((e) => /gym|training|workout/i.test(e.title || ''))

  const timed = []
  for (const ev of dayEvents) {
    const sm = typeof ev.startMin === 'number' ? ev.startMin : 0
    timed.push({
      startMin: sm,
      timeLabel: minToLabel(sm),
      title: ev.title || 'Block',
      detail: ev.notes?.trim() || null,
      kind: 'event',
    })
  }
  if (!hasGymLikeEvent && Object.prototype.hasOwnProperty.call(GYM_SCHEDULE, dow)) {
    const slot = GYM_SCHEDULE[dow]
    const gm = timeStrToMin(slot)
    timed.push({
      startMin: gm,
      timeLabel: slot,
      title: 'Gym (your usual slot)',
      detail: null,
      kind: 'gym',
    })
  }
  timed.sort((a, b) => a.startMin - b.startMin)

  /** @type {Array<{ order: number, timeLabel: string | null, headline: string, detail: string | null, kind: string }>} */
  const suggestions = []
  let order = 1
  for (const t of timed) {
    suggestions.push({
      order: order++,
      timeLabel: t.timeLabel,
      headline: t.title,
      detail: t.detail,
      kind: t.kind,
    })
  }

  if (overdue.length) {
    const names = overdue.slice(0, 5).map((t) => t.title).join(' · ')
    suggestions.push({
      order: order++,
      timeLabel: null,
      headline: `Catch up — ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
      detail: names,
      kind: 'overdue',
    })
  }
  if (dueToday.length) {
    suggestions.push({
      order: order++,
      timeLabel: null,
      headline: `Due today (${dueToday.length})`,
      detail: dueToday
        .slice(0, 8)
        .map((t) => `${t.title}${t.priority === 'HIGH' ? ' · high' : ''}`)
        .join(' · '),
      kind: 'today',
    })
  }
  for (const g of goals) {
    suggestions.push({
      order: order++,
      timeLabel: null,
      headline: `Deadline: ${g.title}`,
      detail: g.unit ? `${g.current ?? '—'} → ${g.target} ${g.unit}` : null,
      kind: 'goal',
    })
  }
  for (const p of onThisDay) {
    suggestions.push({
      order: order++,
      timeLabel: null,
      headline: p.title,
      detail: p.sub || 'Datebook',
      kind: 'personal',
    })
  }
  if (isPaydayToday(todayStr)) {
    suggestions.push({
      order: order++,
      timeLabel: null,
      headline: 'Payday',
      detail: 'Run capital checkpoint',
      kind: 'payday',
    })
  }

  if (suggestions.length === 0) {
    const { ranked } = rankOpenTodosForWeek(todosOpen, ref)
    const top = ranked.slice(0, 4)
    if (top.length) {
      suggestions.push({
        order: 1,
        timeLabel: null,
        headline: 'No hard deadlines — top open tasks',
        detail: top.map((r) => r.todo.title).join(' · '),
        kind: 'open',
      })
    } else {
      suggestions.push({
        order: 1,
        timeLabel: null,
        headline: 'Queue empty',
        detail:
          'Add tasks, personal dates, or timed blocks (Calendar → Schedule). No external calendar feed.',
        kind: 'empty',
      })
    }
  }

  return { suggestions }
}

/**
 * @param {string} timeHHmm — from `<input type="time" />`
 */
export function timeInputToStartMin(timeHHmm) {
  return timeStrToMin(timeHHmm)
}
