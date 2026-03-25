import { useEffect, useRef } from 'react'
import { getSyncToken } from '../lib/dexieSnapshot.js'
import { pushCloud } from '../lib/syncApi.js'

const DEBOUNCE_MS = 90_000

/**
 * Background upload after local Dexie changes (debounced).
 */
export default function CloudSyncManager() {
  const timer = useRef(null)

  useEffect(() => {
    const schedule = () => {
      const token = getSyncToken()
      if (!token || token.length < 8) return

      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        timer.current = null
        const r = await pushCloud(token)
        if (!r.ok && r.conflict) {
          console.warn('[FORGE] Cloud push skipped — conflict. Pull from Sync panel.')
        } else if (!r.ok) {
          console.warn('[FORGE] Cloud push failed:', r.error)
        }
      }, DEBOUNCE_MS)
    }

    window.addEventListener('fieldlog-data-mutated', schedule)
    return () => {
      window.removeEventListener('fieldlog-data-mutated', schedule)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return null
}
