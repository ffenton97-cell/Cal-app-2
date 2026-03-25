import { format, subDays } from 'date-fns'
import { db } from '../db'
import { getLevelInfo } from '../theme'

const XP_ID = 'singleton'

/**
 * Snapshot of local app data for the Operator panel (no secrets).
 */
export async function buildChatContextSnapshot() {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'))

  const [
    openTodos,
    goalsOpen,
    entryToday,
    entryYesterday,
    outboundRows,
    workoutsRecent,
    foodToday,
    xpRow,
  ] = await Promise.all([
    db.todos.filter((t) => !t.done).toArray(),
    db.goals.filter((g) => !g.completed).toArray(),
    db.entries.get(todayStr),
    db.entries.get(format(subDays(new Date(), 1), 'yyyy-MM-dd')),
    Promise.all(days.map((d) => db.outbound.get(d))),
    db.workouts.orderBy('date').reverse().limit(8).toArray(),
    db.food.get(todayStr),
    db.xp.get(XP_ID),
  ])

  const outboundLast7 = days.map((d, i) => {
    const r = outboundRows[i]
    return r
      ? {
          date: d,
          calls: r.calls ?? 0,
          meetings: r.meetings ?? 0,
          convos: r.convos ?? 0,
          emails: r.emails ?? 0,
        }
      : { date: d, calls: 0, meetings: 0, convos: 0, emails: 0 }
  })

  const totalXp = xpRow?.totalXp ?? 0
  const levelInfo = getLevelInfo(totalXp)

  return {
    generatedAt: new Date().toISOString(),
    today: todayStr,
    xp: {
      total: totalXp,
      earnedToday: xpRow?.earnedToday ?? 0,
      level: levelInfo.current.level,
      levelTitle: levelInfo.current.title,
    },
    checkIn: {
      today: entryToday
        ? {
            weight: entryToday.weight,
            protein: entryToday.protein,
            cals: entryToday.cals,
            mood: entryToday.mood,
            moodWord: entryToday.moodWord,
            gym: entryToday.gym,
            win: entryToday.win,
            sales: entryToday.sales,
          }
        : null,
      yesterday: entryYesterday
        ? {
            mood: entryYesterday.mood,
            gym: entryYesterday.gym,
          }
        : null,
    },
    openTasks: openTodos.slice(0, 60).map((t) => ({
      title: t.title,
      due: t.due || null,
      priority: t.priority || 'MED',
      category: t.category || null,
    })),
    goals: goalsOpen.slice(0, 15).map((g) => ({
      title: g.title,
      current: g.current,
      target: g.target,
      unit: g.unit,
      deadline: g.deadline,
      category: g.category,
    })),
    outreachLast7Days: outboundLast7,
    recentWorkouts: workoutsRecent.map((w) => ({
      date: w.date,
      type: w.type,
      notes: w.notes ? String(w.notes).slice(0, 200) : null,
      exerciseCount: Array.isArray(w.exercises) ? w.exercises.length : 0,
    })),
    foodToday: foodToday
      ? {
          totalCal: foodToday.totalCal,
          totalProtein: foodToday.totalProtein,
        }
      : null,
  }
}
