import { db } from '../db'
import {
  exportSnapshot,
  importSnapshot,
  getSyncToken,
  setSyncToken,
  setLastRemoteUpdatedAt,
} from './dexieSnapshot.js'

async function parseJson(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { error: text || `HTTP ${res.status}` }
  }
}

/**
 * @param {string} token
 */
export async function pullCloud(token, { force = false } = {}) {
  const res = await fetch('/api/sync', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await parseJson(res)

  if (res.status === 404) {
    return { ok: false, error: 'No cloud data yet — push from a device that already has your log.' }
  }
  if (!res.ok) {
    return { ok: false, error: data.error || `Pull failed (${res.status})` }
  }

  const localRows = await db.entries.count()
  if (localRows > 0 && !force) {
    return {
      ok: false,
      needsConfirm: true,
      remoteUpdatedAt: data.updatedAt,
      error: 'This device already has data. Pull replaces everything with the cloud copy.',
    }
  }

  await importSnapshot(data.snapshot)
  setLastRemoteUpdatedAt(Number(data.updatedAt) || Date.now())
  return { ok: true }
}

/**
 * @param {string} token
 */
export async function pushCloud(token) {
  const snapshot = await exportSnapshot()
  const updatedAt = Date.now()
  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ updatedAt, snapshot }),
  })
  const data = await parseJson(res)

  if (res.status === 409) {
    return {
      ok: false,
      conflict: true,
      error: data.error || 'Cloud has newer data — pull first, then push.',
      serverUpdatedAt: data.serverUpdatedAt,
    }
  }
  if (!res.ok) {
    return { ok: false, error: data.error || `Push failed (${res.status})` }
  }

  setLastRemoteUpdatedAt(updatedAt)
  return { ok: true }
}

export { getSyncToken, setSyncToken }
