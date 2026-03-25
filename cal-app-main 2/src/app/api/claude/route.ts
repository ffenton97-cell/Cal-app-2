import { NextResponse } from 'next/server'
import { anthropicMessages } from '@/lib/anthropic'

export async function POST(request: Request) {
  const raw = await request.text()
  if (raw.length > 400_000) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let body: {
    system?: string
    messages?: { role: string; content: string }[]
    max_tokens?: number
    model?: string
  }
  try {
    body = JSON.parse(raw || '{}') as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { system, messages, max_tokens, model } = body
  if (!system || typeof system !== 'string') {
    return NextResponse.json({ error: 'Missing system' }, { status: 400 })
  }
  if (!Array.isArray(messages) || messages.length < 1) {
    return NextResponse.json({ error: 'Missing messages' }, { status: 400 })
  }

  try {
    const json = (await anthropicMessages({
      model,
      max_tokens: Math.min(Number(max_tokens) || 600, 4096),
      system,
      messages,
    })) as { content?: unknown; id?: string; model?: string }
    return NextResponse.json({
      content: json.content,
      id: json.id,
      model: json.model,
    })
  } catch (e) {
    const err = e as Error & { statusCode?: number }
    const code =
      err.statusCode && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : 500
    return NextResponse.json(
      { error: err.message || 'FORGE model request failed' },
      { status: code },
    )
  }
}
