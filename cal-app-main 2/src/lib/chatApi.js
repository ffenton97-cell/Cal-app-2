const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'

async function apiFetch(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(text || `Operator chat error (${res.status})`)
  }
  if (!res.ok) {
    throw new Error(json.error || json.message || `Operator chat ${res.status}`)
  }
  const block = json.content?.find((b) => b.type === 'text')
  if (!block?.text) throw new Error('Empty reply from FORGE')
  return block.text.trim()
}

/**
 * @param {{ role: 'user' | 'assistant', content: string }[]} messages
 * @param {Record<string, unknown>} context
 * @returns {Promise<string>} model reply plain text
 */
export async function callChatAssistant(messages, context) {
  return apiFetch('/api/chat', {
    messages,
    context,
    model: process.env.NEXT_PUBLIC_CLAUDE_MODEL || DEFAULT_MODEL,
    max_tokens: 2048,
  })
}
