import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export function useScans() {
  return useLiveQuery(() => db.scans.orderBy('date').reverse().toArray(), []) ?? []
}

export async function saveScan(data) {
  return db.scans.put(data)
}

export async function deleteScan(id) {
  return db.scans.delete(id)
}
