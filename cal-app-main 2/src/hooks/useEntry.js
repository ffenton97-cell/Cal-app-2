import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../db'

/**
 * Returns today's check-in entry (or undefined if not yet logged).
 * Pass an optional date string (YYYY-MM-DD) to get a specific day.
 */
export function useEntry(dateStr) {
  const today = dateStr ?? format(new Date(), 'yyyy-MM-dd')
  return useLiveQuery(() => db.entries.get(today), [today])
}

/**
 * Save (put) a check-in entry for a given date.
 * Merges with any existing data for that date.
 */
export async function saveEntry(dateStr, data) {
  const existing = await db.entries.get(dateStr)
  return db.entries.put({ date: dateStr, ...existing, ...data })
}
