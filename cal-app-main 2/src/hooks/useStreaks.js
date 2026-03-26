import { useLiveQuery } from 'dexie-react-hooks'
import { format, subDays, parseISO } from 'date-fns'
import { db } from '../db'

/**
 * Computes a consecutive-day streak by walking backwards from today.
 * `table`  — Dexie table name
 * `field`  — optional truthy-check field (e.g. 'gym' must be true)
 */
export async function calcStreak(table, field) {
  const today = format(new Date(), 'yyyy-MM-dd')
  let streak = 0
  let cursor = today

  for (let i = 0; i < 365; i++) {
    const record = await db[table].get(cursor)
    const hit = record && (field ? record[field] : true)
    if (!hit) break
    streak++
    cursor = format(subDays(parseISO(cursor), 1), 'yyyy-MM-dd')
  }
  return streak
}

export function useStreaks() {
  const checkInStreak = useLiveQuery(() => calcStreak('entries'), [])
  const gymStreak     = useLiveQuery(() => calcStreak('entries', 'gym'), [])
  const weightStreak  = useLiveQuery(
    () => db.entries.filter((e) => !!e.weight).count(),
    []
  )

  return {
    checkInStreak: checkInStreak ?? 0,
    gymStreak:     gymStreak ?? 0,
    totalWeightLogs: weightStreak ?? 0,
  }
}
