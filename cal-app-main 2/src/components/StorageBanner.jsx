import { useEffect, useState } from 'react'
import { db } from '../db'

/**
 * Shown when IndexedDB cannot open (common in some private modes / strict browsers).
 */
export default function StorageBanner() {
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    db.open().catch((err) => {
      setMsg(err?.message || 'Local storage is not available in this browser session.')
    })
  }, [])

  if (!msg) return null

  return (
    <div
      className="ff-mono shrink-0 border-b border-realm-ember/35 bg-realm-ember/15 px-4 py-2.5 text-center text-[11px] leading-snug text-realm-ember"
      role="alert"
    >
      Data cannot be saved on this device: {msg}. Try a normal (non-private) tab or another browser, or install the app to the home screen.
    </div>
  )
}
