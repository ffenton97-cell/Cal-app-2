import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Trash2, Paperclip, XCircle } from 'lucide-react'
import { buildChatContextSnapshot } from '../lib/chatContext.js'
import { callChatAssistant } from '../lib/chatApi.js'
import { FORGE_ICON_GRADIENT } from '../theme'

const STORAGE_KEY = 'forge_operator_chat_v1'
const LEGACY_KEY = 'fieldlog_coach_chat_v1'

/** Content is either a string or an array of blocks (text/image). */
function isValidContent(content) {
  if (typeof content === 'string') return content.trim().length > 0
  if (Array.isArray(content)) return content.length > 0
  return false
}

function loadStoredMessages() {
  if (typeof window === 'undefined') return []
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      raw = localStorage.getItem(LEGACY_KEY)
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw)
        localStorage.removeItem(LEGACY_KEY)
      }
    }
    if (!raw) return []
    const p = JSON.parse(raw)
    if (!Array.isArray(p.messages)) return []
    return p.messages.filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        isValidContent(m.content)
    )
  } catch {
    return []
  }
}

function normalizeHistory(list) {
  const out = []
  for (const m of list) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue
    if (!isValidContent(m.content)) continue
    if (typeof m.content === 'string') {
      out.push({ role: m.role, content: m.content.trim() })
    } else {
      out.push({ role: m.role, content: m.content })
    }
  }
  while (out.length > 0 && out[0].role === 'assistant') out.shift()
  return out.slice(-80)
}

/** Strip image data before writing to localStorage — base64 is too large. */
function toStorable(messages) {
  return messages.map((m) => {
    if (typeof m.content === 'string') return m
    const stripped = m.content.map((block) =>
      block.type === 'image' ? { type: 'text', text: '[image]' } : block
    )
    return { ...m, content: stripped }
  })
}

export default function ChatPanel({ open, onClose }) {
  const [messages, setMessages] = useState(loadStoredMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  /** { dataUrl: string, data: string, mediaType: string } | null */
  const [pendingImage, setPendingImage] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: toStorable(messages) }))
  }, [messages])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open])

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open, messages, loading])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
    setPendingImage(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_KEY)
  }, [])

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const dataUrl = evt.target.result
      const mediaType = file.type || 'image/jpeg'
      const data = dataUrl.split(',')[1]
      setPendingImage({ dataUrl, data, mediaType })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if ((!text && !pendingImage) || loading) return

    let userContent
    if (pendingImage) {
      userContent = [
        { type: 'image', source: { type: 'base64', media_type: pendingImage.mediaType, data: pendingImage.data } },
        { type: 'text', text: text || 'Analyse this image and extract any relevant data.' },
      ]
    } else {
      userContent = text
    }

    setError(null)
    setInput('')
    setPendingImage(null)
    const prior = normalizeHistory(messages)
    const nextUser = { role: 'user', content: userContent }
    const forApi = normalizeHistory([...prior, nextUser])
    setMessages((m) => [...normalizeHistory(m), nextUser])
    setLoading(true)

    try {
      const context = await buildChatContextSnapshot()
      const replyText = await callChatAssistant(forApi, context)
      setMessages((m) => [...normalizeHistory(m), { role: 'assistant', content: replyText }])
    } catch (err) {
      setError(err?.message || 'Request failed')
      setMessages((m) => {
        const n = normalizeHistory(m)
        const last = n[n.length - 1]
        if (last?.role === 'user') return n.slice(0, -1)
        return n
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex justify-end ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 transition-opacity duration-150 ease-out ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-label="Close"
        tabIndex={open ? 0 : -1}
      />

      <aside
        className={`relative flex h-full w-full max-w-[min(100vw,440px)] flex-col border-l border-[rgba(220,60,80,0.06)] bg-[#0f0a0b] shadow-[-12px_0_40px_rgba(0,0,0,0.45)] transition-transform duration-150 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forge-chat-title"
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[rgba(220,60,80,0.06)] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="h-6 w-6 shrink-0 rounded-md border border-[rgba(220,60,80,0.18)]"
              style={{ background: FORGE_ICON_GRADIENT }}
              aria-hidden
            />
            <div className="min-w-0">
              <h2 id="forge-chat-title" className="text-[14px] font-semibold text-[#f5f0f0]">
                Operator
              </h2>
              <p className="forge-mono truncate text-[10px] text-[rgba(255,255,255,0.28)]">
                Attach screenshots · Full context on send
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={clearChat}
              className="rounded-md p-2 text-[rgba(255,255,255,0.32)] transition-colors duration-150 ease-out hover:bg-white/[0.04] hover:text-[#f5f0f0]"
              title="Clear thread"
              aria-label="Clear thread"
            >
              <Trash2 size={16} strokeWidth={1.6} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-[rgba(255,255,255,0.32)] transition-colors duration-150 ease-out hover:bg-white/[0.04] hover:text-[#f5f0f0]"
              aria-label="Close"
            >
              <X size={18} strokeWidth={1.6} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 [scrollbar-width:thin]">
          {messages.length === 0 && !loading && (
            <p className="text-[12.5px] font-normal leading-[1.65] text-[rgba(255,255,255,0.55)]">
              State the move. Training, check-in, outreach, tasks, capital — data refreshes on each send. Attach screenshots to extract data.
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {messages.map((m, i) => {
              const key = `${i}-${m.role}`
              return (
                <li
                  key={key}
                  className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[min(100%,340px)] border px-2.5 py-2 text-[12.5px] font-normal leading-[1.65] text-[rgba(255,255,255,0.68)] ${
                      m.role === 'user'
                        ? 'rounded-[10px] rounded-tr-[3px] border-[rgba(220,60,80,0.1)] bg-[rgba(220,60,80,0.04)]'
                        : 'rounded-[10px] rounded-tl-[3px] border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]'
                    }`}
                  >
                    <span className="forge-mono mb-1 block text-[9px] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.28)]">
                      {m.role === 'user' ? 'You' : 'FORGE'}
                    </span>
                    {typeof m.content === 'string' ? (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {m.content.map((block, j) => {
                          if (block.type === 'image' && block.source?.data) {
                            return (
                              <img
                                key={j}
                                src={`data:${block.source.media_type};base64,${block.source.data}`}
                                className="max-w-full rounded-[6px] opacity-90"
                                alt="attached screenshot"
                              />
                            )
                          }
                          if (block.type === 'image') {
                            return (
                              <em key={j} className="text-[rgba(255,255,255,0.28)]">[image]</em>
                            )
                          }
                          if (block.type === 'text' && block.text) {
                            return <div key={j} className="whitespace-pre-wrap">{block.text}</div>
                          }
                          return null
                        })}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          {loading && (
            <p className="forge-mono mt-3 text-[10px] text-[rgba(255,255,255,0.28)]">Running pass…</p>
          )}
          {error && (
            <p className="mt-3 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(212,160,80,0.06)] px-2.5 py-2 text-[12.5px] text-[rgba(255,255,255,0.55)]">
              {error}
            </p>
          )}
          <div ref={bottomRef} className="h-1 w-full shrink-0" />
        </div>

        <form
          onSubmit={handleSend}
          className="shrink-0 border-t border-[rgba(220,60,80,0.06)] bg-[#0a0607] p-2.5"
        >
          {/* Image preview */}
          {pendingImage && (
            <div className="mb-2 flex items-center gap-2 rounded-[8px] border border-[rgba(220,60,80,0.15)] bg-[rgba(220,60,80,0.06)] px-2.5 py-2">
              <img
                src={pendingImage.dataUrl}
                alt="pending attachment"
                className="h-12 w-12 shrink-0 rounded-[4px] object-cover opacity-90"
              />
              <span className="forge-mono flex-1 text-[10px] text-[rgba(255,255,255,0.45)] truncate">
                Screenshot ready · add a note or send as-is
              </span>
              <button
                type="button"
                onClick={() => setPendingImage(null)}
                className="shrink-0 text-[rgba(255,255,255,0.32)] hover:text-[#f5f0f0]"
                aria-label="Remove attachment"
              >
                <XCircle size={16} strokeWidth={1.6} />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              aria-label="Attach image"
            />
            {/* Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="h-11 shrink-0 self-start rounded-[7px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] px-3 text-[rgba(255,255,255,0.38)] transition-colors duration-150 ease-out hover:border-[rgba(220,60,80,0.25)] hover:text-realm-gold disabled:opacity-35"
              title="Attach screenshot"
              aria-label="Attach screenshot"
            >
              <Paperclip size={15} strokeWidth={1.6} />
            </button>

            <div className="relative min-h-[44px] flex-1">
              <label htmlFor="forge-chat-input" className="sr-only">
                Message
              </label>
              <span
                className="forge-mono pointer-events-none absolute left-3 top-2.5 text-[11px] text-[rgba(224,80,112,0.6)]"
                aria-hidden
              >
                forge ›
              </span>
              <textarea
                id="forge-chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
                placeholder={pendingImage ? 'add a note (optional)…' : 'signal or question'}
                rows={2}
                disabled={loading}
                className="min-h-[44px] w-full resize-none rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.025)] py-2 pr-2 pl-[4.25rem] text-[12.5px] text-[#f5f0f0] placeholder:italic placeholder:text-[rgba(255,255,255,0.22)] outline-none transition-colors duration-150 ease-out focus:border-[rgba(224,80,112,0.35)] disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading || (!input.trim() && !pendingImage)}
              className="h-11 shrink-0 self-start rounded-[7px] bg-[#c43050] px-4 text-[12px] font-medium text-white transition-opacity duration-150 ease-out hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Send
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}
