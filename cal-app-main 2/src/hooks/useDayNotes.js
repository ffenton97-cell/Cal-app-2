import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../db'

export function useDayNote(dateStr) {
  const today = dateStr ?? format(new Date(), 'yyyy-MM-dd')
  return useLiveQuery(() => db.dayNotes.get(today), [today])
}

export async function saveDayNote(dateStr, text) {
  if (!text.trim()) return db.dayNotes.delete(dateStr)
  return db.dayNotes.put({ date: dateStr, notes: [text.trim()] })
}
