import { db } from '../db'

const SNAPSHOT_TABLES = [
  'entries',
  'workouts',
  'food',
  'outbound',
  'todos',
  'dayNotes',
  'goals',
  'scans',
  'finance',
  'xp',
  'importantDates',
  'salesUX',
  'armoury',
  'exerciseCatalog',
  'workoutBatches',
  'dayEvents',
]

const LS_KEYS = ['fieldlog_seeded_v1']

export const SYNC_TOKEN_KEY = 'fieldlog_sync_token'
export const LAST_SYNC_REMOTE_AT_KEY = 'fieldlog_last_remote_updated_at'

function readLocalStorageBundle() {
  if (typeof window === 'undefined') return {}
  const o = {}
  for (const k of LS_KEYS) {
    const v = localStorage.getItem(k)
    if (v != null) o[k] = v
  }
  return o
}

function writeLocalStorageBundle(bundle) {
  if (typeof window === 'undefined') return
  if (!bundle || typeof bundle !== 'object') return
  for (const k of LS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(bundle, k)) {
      if (bundle[k] == null) localStorage.removeItem(k)
      else localStorage.setItem(k, String(bundle[k]))
    }
  }
}

/**
 * Full export for cloud sync (last-write-wins blob).
 */
export async function exportSnapshot() {
  const tables = {}
  for (const name of SNAPSHOT_TABLES) {
    tables[name] = await db[name].toArray()
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables,
    localStorage: readLocalStorageBundle(),
  }
}

/**
 * Replace local DB from a snapshot (destructive).
 */
export async function importSnapshot(snapshot) {
  if (!snapshot?.tables) throw new Error('Invalid snapshot')

  await db.transaction('rw', ...SNAPSHOT_TABLES.map((n) => db[n]), async () => {
    for (const name of SNAPSHOT_TABLES) {
      await db[name].clear()
      const rows = snapshot.tables[name]
      if (Array.isArray(rows) && rows.length > 0) {
        await db[name].bulkPut(rows)
      }
    }
  })

  writeLocalStorageBundle(snapshot.localStorage)
}

export function getSyncToken() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(SYNC_TOKEN_KEY)?.trim() || ''
}

export function setSyncToken(token) {
  if (typeof window === 'undefined') return
  const t = token?.trim()
  if (!t) {
    localStorage.removeItem(SYNC_TOKEN_KEY)
    return
  }
  localStorage.setItem(SYNC_TOKEN_KEY, t)
}

export function getLastRemoteUpdatedAt() {
  if (typeof window === 'undefined') return 0
  const n = Number(localStorage.getItem(LAST_SYNC_REMOTE_AT_KEY))
  return Number.isFinite(n) ? n : 0
}

export function setLastRemoteUpdatedAt(ts) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LAST_SYNC_REMOTE_AT_KEY, String(ts))
}
