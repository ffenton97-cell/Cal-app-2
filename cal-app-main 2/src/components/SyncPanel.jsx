import { useState, useEffect } from 'react'
import { X, Cloud, CloudOff, Download, Upload } from 'lucide-react'
import {
  getSyncToken,
  setSyncToken,
  getLastRemoteUpdatedAt,
} from '../lib/dexieSnapshot.js'
import { pullCloud, pushCloud } from '../lib/syncApi.js'

export default function SyncPanel({ open, onClose, onTokenSaved }) {
  const [token, setTokenInput] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setTokenInput(getSyncToken())
      setMsg(null)
    }
  }, [open])

  if (!open) return null

  const hasToken = getSyncToken().length >= 8
  const lastRemote = getLastRemoteUpdatedAt()

  async function saveToken() {
    setSyncToken(token)
    onTokenSaved?.()
    setMsg({ type: 'ok', text: 'Passphrase saved on this device only — use the same one on your other devices.' })
  }

  async function doPull(force) {
    const t = getSyncToken()
    if (t.length < 8) {
      setMsg({ type: 'err', text: 'Set a passphrase first (min 8 characters).' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const r = await pullCloud(t, { force })
      if (r.ok) {
        setMsg({ type: 'ok', text: 'Loaded from cloud. Reloading…' })
        setTimeout(() => window.location.reload(), 400)
      } else if (r.needsConfirm) {
        setMsg({
          type: 'warn',
          text: `${r.error} Tap “Replace local” to overwrite this device.`,
        })
      } else {
        setMsg({ type: 'err', text: r.error || 'Pull failed' })
      }
    } catch (e) {
      setMsg({ type: 'err', text: e.message || 'Pull failed' })
    } finally {
      setBusy(false)
    }
  }

  async function doPush() {
    const t = getSyncToken()
    if (t.length < 8) {
      setMsg({ type: 'err', text: 'Set a passphrase first (min 8 characters).' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const r = await pushCloud(t)
      if (r.ok) {
        setMsg({ type: 'ok', text: 'Uploaded to cloud. Other devices can pull this snapshot.' })
      } else if (r.conflict) {
        setMsg({
          type: 'err',
          text: r.error + (r.serverUpdatedAt ? ` (server ts ${r.serverUpdatedAt})` : ''),
        })
      } else {
        setMsg({ type: 'err', text: r.error || 'Push failed' })
      }
    } catch (e) {
      setMsg({ type: 'err', text: e.message || 'Push failed' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cloud sync"
    >
      <div className="w-full sm:max-w-md bg-realm-bg-mid border border-realm-hairline sm:rounded-none shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-realm-border">
          <div className="flex items-center gap-2">
            {hasToken ? (
              <Cloud size={18} className="text-realm-gold" />
            ) : (
              <CloudOff size={18} className="text-realm-muted" />
            )}
            <span className="ff-mono text-[11px] tracking-[0.2em] text-realm-gold uppercase">
              Cloud sync
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-realm-muted hover:text-realm-text"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <p className="ff-mono text-[11px] text-realm-soft leading-relaxed">
            Use one long passphrase on every device. Data is stored in your Netlify Blob (last write wins).
            Push after changes; pull on a new device before you start logging.
          </p>

          <div>
            <label className="ios-label block mb-1.5">
              Sync passphrase
            </label>
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Same phrase on phone + laptop"
              className="fl-input"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={saveToken}
                className="flex-1 py-2 ff-mono text-[10px] uppercase tracking-wider border border-realm-border text-realm-gold hover:border-realm-gold/45"
              >
                Save on device
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
                  setTokenInput(id.replace(/-/g, '') + id.replace(/-/g, ''))
                }}
                className="py-2 px-3 ff-mono text-[10px] uppercase tracking-wider border border-realm-border text-realm-muted hover:text-realm-text"
              >
                Generate
              </button>
            </div>
          </div>

          {lastRemote > 0 && (
            <p className="ff-mono text-[9px] text-realm-faint">
              Last successful sync clock: {new Date(lastRemote).toLocaleString()}
            </p>
          )}

          {msg && (
            <p
              className={`ff-mono text-[11px] leading-snug p-2 border ${
                msg.type === 'ok'
                  ? 'border-[#4ade8040] text-[#4ade80]'
                  : msg.type === 'warn'
                    ? 'border-[#fbbf2440] text-[#fbbf24]'
                    : 'border-[#f8717140] text-[#f87171]'
              }`}
            >
              {msg.text}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => doPull(false)}
              className="flex items-center justify-center gap-2 py-3 ff-mono text-[10px] uppercase tracking-wider border border-realm-border text-realm-text disabled:opacity-40"
            >
              <Download size={14} />
              Pull
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={doPush}
              className="flex items-center justify-center gap-2 py-3 ff-mono text-[10px] uppercase tracking-wider border border-realm-border text-realm-text disabled:opacity-40"
            >
              <Upload size={14} />
              Push
            </button>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => doPull(true)}
            className="w-full py-2 ff-mono text-[9px] uppercase tracking-widest text-[#f87171] border border-[#f8717140]"
          >
            Replace local from cloud
          </button>

          <p className="ff-mono text-[9px] text-[#2a2a2a] text-center uppercase tracking-widest">
            Auto-push ~90s after you change data (same passphrase)
          </p>
        </div>
      </div>
    </div>
  )
}
