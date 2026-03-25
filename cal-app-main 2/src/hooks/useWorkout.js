import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../db'

export function useWorkout(dateStr) {
  const today = dateStr ?? format(new Date(), 'yyyy-MM-dd')
  return useLiveQuery(() => db.workouts.get(today), [today])
}

export async function saveWorkout(dateStr, data) {
  const existing = await db.workouts.get(dateStr)
  return db.workouts.put({ date: dateStr, ...existing, ...data })
}
