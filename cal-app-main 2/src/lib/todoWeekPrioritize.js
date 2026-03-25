import { format, parseISO, differenceInCalendarDays, startOfISOWeek, endOfISOWeek } from 'date-fns'
import { db } from '../db'

/**
 * Score open tasks for the current ISO week: overdue > due this week > sales/dial signals > priority.
 */
export function rankOpenTodosForWeek(openTodos, refDate = new Date()) {
  const todayStr = format(refDate, 'yyyy-MM-dd')
  const wEnd = format(endOfISOWeek(refDate), 'yyyy-MM-dd')

  const scoreOne = (todo) => {
    let s = 0
    const hints = []

    if (todo.priority === 'HIGH') s += 5
    else if (todo.priority === 'MED') s += 2.5
    else s += 1

    if (todo.due) {
      if (todo.due < todayStr) {
        const days = differenceInCalendarDays(
          parseISO(`${todayStr}T12:00:00`),
          parseISO(`${todo.due}T12:00:00`)
        )
        s += 8 + Math.min(days, 21) * 2
        hints.push(days === 1 ? '1d overdue' : `${days}d overdue`)
      } else if (todo.due <= wEnd) {
        const daysUntil = differenceInCalendarDays(
          parseISO(`${todo.due}T12:00:00`),
          parseISO(`${todayStr}T12:00:00`)
        )
        s += 6 - Math.min(daysUntil, 6) * 0.35
        hints.push('due this week')
      } else {
        s += 1.5
        hints.push('later')
      }
    } else {
      s += 0.8
      hints.push('no date')
    }

    const cat = (todo.category || '').toUpperCase()
    if (cat.includes('SALES')) {
      s += 4
      hints.push('sales')
    }
    if (cat.includes('WORK')) s += 1

    const title = (todo.title || '').toUpperCase()
    if (title.includes('OUTBOUND') || title.includes('DIAL') || title.includes('CALL')) {
      s += 3
      hints.push('calls')
    }
    if (title.includes('OTE') || title.includes('MEETING') || title.includes('PIPELINE')) s += 2

    return { score: Math.round(s * 10) / 10, hints: [...new Set(hints)] }
  }

  const ranked = openTodos
    .filter((t) => !t.done)
    .map((todo) => {
      const { score, hints } = scoreOne(todo)
      return { todo, score, hints }
    })
    .sort((a, b) => b.score - a.score)

  const weekStart = format(startOfISOWeek(refDate), 'yyyy-MM-dd')
  const weekEnd = wEnd
  return {
    ranked,
    weekLabel: `${weekStart} → ${weekEnd}`,
    weekStart,
    weekEnd,
  }
}

/**
 * Map weekly rank to HIGH (top 3), MED (next 5), LOW (rest) for open tasks only.
 */
export async function applyWeeklyPrioritySuggestions(rankedEntries) {
  for (let i = 0; i < rankedEntries.length; i++) {
    const { todo } = rankedEntries[i]
    if (todo.done) continue
    let priority = 'LOW'
    if (i < 3) priority = 'HIGH'
    else if (i < 8) priority = 'MED'
    const row = await db.todos.get(todo.id)
    if (row && !row.done) await db.todos.put({ ...row, priority })
  }
}
