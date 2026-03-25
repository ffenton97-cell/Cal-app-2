import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export function useFinanceRecords() {
  return useLiveQuery(() => db.finance.orderBy('date').reverse().toArray(), []) ?? []
}

export async function saveFinanceRecord(data) {
  return db.finance.put(data)
}

export async function deleteFinanceRecord(id) {
  return db.finance.delete(id)
}
