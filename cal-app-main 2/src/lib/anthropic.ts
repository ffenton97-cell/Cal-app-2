type AnthropicMessage = { role: string; content: string }

type AnthropicPayload = {
  model?: string
  max_tokens?: number
  system: string
  messages: AnthropicMessage[]
}

type AnthropicError = Error & { statusCode?: number }

export async function anthropicMessages(payload: AnthropicPayload) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    const err: AnthropicError = new Error('ANTHROPIC_API_KEY is not configured')
    err.statusCode = 503
    throw err
  }

  const model =
    payload.model || process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: payload.max_tokens ?? 600,
      system: payload.system,
      messages: payload.messages,
    }),
  })

  const text = await res.text()
  let json: { error?: { message?: string }; message?: string; content?: unknown }
  try {
    json = JSON.parse(text) as typeof json
  } catch {
    const err: AnthropicError = new Error(text || `Anthropic HTTP ${res.status}`)
    err.statusCode = res.status
    throw err
  }

  if (!res.ok) {
    const err: AnthropicError = new Error(
      json.error?.message || json.message || `Anthropic ${res.status}`,
    )
    err.statusCode = res.status
    throw err
  }

  return json
}
