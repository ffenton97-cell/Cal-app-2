const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'
const DEFAULT_MAX = 600

/**
 * @param {{ system: string, messages: { role: 'user' | 'assistant', content: string }[], max_tokens?: number, model?: string }} body
 * @returns {Promise<string>} assistant plain text
 */
export async function callClaudeProxy(body) {
  const url = '/api/claude'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: body.model || process.env.NEXT_PUBLIC_CLAUDE_MODEL || DEFAULT_MODEL,
      max_tokens: body.max_tokens ?? DEFAULT_MAX,
      system: body.system,
      messages: body.messages,
    }),
  })

  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(text || `FORGE proxy error (${res.status})`)
  }

  if (!res.ok) {
    throw new Error(json.error || json.message || `FORGE proxy ${res.status}`)
  }

  const block = json.content?.find((b) => b.type === 'text')
  if (!block?.text) throw new Error('Empty response from FORGE')
  return block.text.trim()
}
