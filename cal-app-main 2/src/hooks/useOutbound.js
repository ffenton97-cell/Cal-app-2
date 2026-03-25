import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../db'

export function useOutbound(dateStr) {
  const today = dateStr ?? format(new Date(), 'yyyy-MM-dd')
  return useLiveQuery(() => db.outbound.get(today), [today])
}

export async function saveOutbound(dateStr, data) {
  const existing = await db.outbound.get(dateStr)
  return db.outbound.put({ date: dateStr, ...existing, ...data })
}
