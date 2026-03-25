import { NextResponse } from 'next/server'
import { anthropicMessages } from '@/lib/anthropic'

const COACH_SYSTEM = `You are FORGE — the operator layer for a private app that holds one user's work and life execution data (training, nutrition, outreach, tasks, goals, capital). You already have context; never ask them to explain their situation.

Voice (non-negotiable):
- Direct. Lead with the finding, then at most one line of why, then the move.
- Economical. Cut filler. No enthusiasm, hedges, or assistant phrases ("Happy to help", "Great question", "You might want to consider").
- Confident, flat affect, peer-level — like a sharp chief of staff briefing before a dense day.
- Use vocabulary: queue, stalled, advancing, window, anchored, sequence, move, signal. Surface actions; do not bury them in prose.

Format when useful:
- Status: "[N] in queue. [Urgent item] — [one line]. [Move]."
- Or: "[Finding]. [Why — one line]. [Move]."
- Inline next steps can start with ↗ (e.g. ↗ Draft follow-up → decision timeline).

Rules:
- Ground claims in the JSON snapshot or the thread. If data is missing, state what's missing in one short phrase, then give the move anyway.
- Never claim you changed data in their app.
- Do not invent numbers not present in snapshot or conversation.
- Medical/legal: one line — professional required.
- Never open with "I'm FORGE" or "How can I help".`

function sanitizeMessages(arr: unknown) {
  if (!Array.isArray(arr)) return []
  return arr
    .filter(
      (m): m is { role: string; content: string } =>
        Boolean(m) &&
        typeof m === 'object' &&
        m !== null &&
        'role' in m &&
        'content' in m &&
        ((m as { role: string }).role === 'user' ||
          (m as { role: string }).role === 'assistant') &&
        typeof (m as { content: unknown }).content === 'string' &&
        String((m as { content: string }).content).length > 0,
    )
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 48000),
    }))
    .slice(-48)
}

export async function POST(request: Request) {
  const raw = await request.text()
  if (raw.length > 500_000) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let body: {
    messages?: unknown
    context?: unknown
    model?: string
    max_tokens?: number
  }
  try {
    body = JSON.parse(raw || '{}') as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const messages = sanitizeMessages(body.messages)
  if (messages.length < 1) {
    return NextResponse.json(
      { error: 'messages must include at least one user or assistant turn' },
      { status: 400 },
    )
  }

  const context =
    body.context != null && typeof body.context === 'object' ? body.context : {}
  let contextStr: string
  try {
    contextStr = JSON.stringify(context, null, 2)
  } catch {
    contextStr = '{}'
  }
  if (contextStr.length > 120_000) {
    contextStr = contextStr.slice(0, 120_000) + '\n…(truncated)'
  }

  const system = `${COACH_SYSTEM}

## Current app data (JSON snapshot)
The following was captured when the user sent their latest message. Use it for personalization.

\`\`\`json
${contextStr}
\`\`\``

  try {
    const json = (await anthropicMessages({
      model: body.model || process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: Math.min(Number(body.max_tokens) || 2048, 4096),
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
      { error: err.message || 'Chat request failed' },
      { status: code },
    )
  }
}
