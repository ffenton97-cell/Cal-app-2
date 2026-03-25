import { format, subDays, parseISO } from 'date-fns'
import { db } from '../db'
import { USER } from '../theme'
import { morningBriefSupplement } from './fieldAnalytics.js'

async function calcGymStreak() {
  const today = format(new Date(), 'yyyy-MM-dd')
  let streak = 0
  let cursor = today
  for (let i = 0; i < 365; i++) {
    const record = await db.entries.get(cursor)
    if (!record?.gym) break
    streak++
    cursor = format(subDays(parseISO(`${cursor}T12:00:00`), 1), 'yyyy-MM-dd')
  }
  return streak
}

async function calcCheckInStreak() {
  const today = format(new Date(), 'yyyy-MM-dd')
  let streak = 0
  let cursor = today
  for (let i = 0; i < 365; i++) {
    const record = await db.entries.get(cursor)
    if (!record) break
    streak++
    cursor = format(subDays(parseISO(`${cursor}T12:00:00`), 1), 'yyyy-MM-dd')
  }
  return streak
}

/**
 * Weight trend: last up to 14 logged weights (date asc).
 */
async function weightTrend() {
  const rows = await db.entries
    .filter((e) => e.weight != null && e.weight > 0)
    .toArray()
  const sorted = rows.sort((a, b) => a.date.localeCompare(b.date)).slice(-14)
  return sorted.map((e) => ({ date: e.date, weight: e.weight }))
}

async function recentJournals(days = 5) {
  const out = []
  for (let i = 0; i < days; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    const row = await db.dayNotes.get(d)
    const text = row?.notes?.[0]
    if (text) out.push({ date: d, text })
  }
  return out
}

async function outboundRollup() {
  const days = Array.from({ length: 14 }, (_, i) =>
    format(subDays(new Date(), i), 'yyyy-MM-dd')
  )
  const records = await Promise.all(days.map((d) => db.outbound.get(d)))
  const live = records.filter(Boolean)
  const calls = live.reduce((s, r) => s + (r.calls || 0), 0)
  const meetings = live.reduce((s, r) => s + (r.meetings || 0), 0)
  const convos = live.reduce((s, r) => s + (r.convos || 0), 0)
  return { daysLogged: live.length, calls, meetings, convos }
}

/**
 * App has no CRM "open deals" fields — summarise sales goals + outbound activity.
 */
async function pipelineSummary() {
  const goals = await db.goals.filter((g) => !g.completed).toArray()
  const salesGoals = goals.filter((g) => (g.category || '').toLowerCase().includes('sales'))
  const roll = await outboundRollup()
  return {
    salesGoals: salesGoals.map((g) => ({
      title: g.title,
      current: g.current,
      target: g.target,
      unit: g.unit,
      deadline: g.deadline,
    })),
    outbound14d: roll,
  }
}

async function goalsSummary() {
  const goals = await db.goals.filter((g) => !g.completed).toArray()
  return goals.map((g) => ({
    title: g.title,
    category: g.category,
    current: g.current,
    target: g.target,
    unit: g.unit,
    deadline: g.deadline,
    why: g.why,
  }))
}

/**
 * Build accountability system prompt from live Dexie data.
 */
export async function buildAccountabilitySystemPrompt() {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayEntry = (await db.entries.get(todayStr)) || {}
  const gymStreak = await calcGymStreak()
  const checkInStreak = await calcCheckInStreak()
  const trend = await weightTrend()
  const journals = await recentJournals(7)
  const pipeline = await pipelineSummary()
  const goals = await goalsSummary()
  const openTodos = await db.todos.filter((t) => !t.done).count()

  const weightLine =
    todayEntry.weight != null
      ? `${todayEntry.weight}kg`
      : trend.length
        ? `last logged ${trend[trend.length - 1].weight}kg (${trend[trend.length - 1].date})`
        : 'not logged today'

  return `You are FORGE — operator voice for one user. Full context below; never ask them to explain their setup. Direct, flat, peer-level. Signal → one line why → move. No hedges, no cheerleading, no assistant filler.

Fixed targets (from app config):
- Weight goal: ${USER.weightTarget}kg (started ${USER.weightStart}kg)
- Cut targets: ${USER.cutCals} cal / ${USER.cutProtein}g protein daily
- Role: ${USER.role} at ${USER.company}

Current computed context:
- Today (${todayStr}) weight context: ${weightLine}
- Check-in streak: ${checkInStreak} days
- Gym streak: ${gymStreak} days
- Open todos: ${openTodos}
- Pipeline / outbound (app has activity metrics, not a full CRM): ${JSON.stringify(pipeline)}
- Active goals: ${JSON.stringify(goals)}

Weight trend (recent logged days, oldest→newest):
${JSON.stringify(trend)}

Today's check-in row (may be partial until saved):
${JSON.stringify(todayEntry)}

Recent journal entries (newest first in list):
${JSON.stringify(journals)}`
}

/**
 * Morning brief: base accountability context + live operator intel.
 */
export async function buildMorningBriefSystemPrompt() {
  const base = await buildAccountabilitySystemPrompt()
  const intel = await morningBriefSupplement()
  return `${base}

Morning intelligence layer (use explicitly; cite these numbers when relevant):
${JSON.stringify(intel, null, 2)}

Instructions for this response: One briefing for today. Lead with what matters. Work in gym slot, protein vs target, tasks due, recent meetings, mood streak, payday, finance only if material. End with one clear move (e.g. dial target if outreach is soft). No markdown headings. ≤200 words.`
}

/**
 * FORGE user payloads for Command syntheses (system prompt stays short).
 */
export const FIELD_ANALYST_SYSTEM = `You are FORGE — Field Command analyst. Evidence-led, Australian English OK. Quantify when JSON has numbers. Lead with signal, not setup. No markdown headings unless asked.`

export function weeklyFieldReportUserMessage(bundle) {
  return `Write the Weekly Field Report for the completed week labelled "${bundle.lastWeekLabel}" (vs prior "${bundle.priorWeekLabel}").

Data JSON:
${JSON.stringify(bundle.weekCompare, null, 2)}

Mindset context (mood counts & wins from current week object):
current.mindset in the JSON.

Also reference correlations (mood vs dials, pay-week rhythm) only if it sharpens the story:
${JSON.stringify(bundle.correlations?.moodVsDials || {}, null, 2)}
${JSON.stringify(bundle.correlations?.payRhythm || {}, null, 2)}

Output sections in plain text, each labelled with ALL CAPS one word: BODY, SALES, FINANCE, MINDSET, GOALS — then NET for a 3-sentence executive summary and ONE ADJUST line. Readable in under 2 minutes.`
}

export function monthlyCommanderUserMessage(bundle) {
  return `Generate the monthly command review (use last ~30d summary even if not a calendar month).

Monthly stats:
${JSON.stringify(bundle.month, null, 2)}

Goal trajectories:
${JSON.stringify(bundle.goals, null, 2)}

Correlations:
${JSON.stringify(bundle.correlations, null, 2)}

Sales intel:
${JSON.stringify(bundle.sales, null, 2)}

Body intel:
${JSON.stringify(bundle.body, null, 2)}

Finance intel:
${JSON.stringify(bundle.finance, null, 2)}

Task intel:
${JSON.stringify(bundle.tasks, null, 2)}

Journal samples (wins + entries):
${JSON.stringify(bundle.journalCorpus, null, 2)}

Produce:
1) DOMAIN SCORECARD — six lines: Body, Sales, Finance, Mind, Goals, Habits each with a letter grade + one clause why.
2) WENT WELL / DID NOT — bullet pairs derived only from data.
3) THE ONE CONSTRAINT — single biggest bottleneck sentence.
4) NEXT MONTH ONE FOCUS — exactly one priority, no list of ten.`
}

export function journalMiningUserMessage(bundle) {
  return `Mine themes from this journal + win corpus. Return: (1) top 5 recurring words/themes with counts if obvious, (2) dominant tone in one sentence, (3) what seems to drive best days. No markdown.

${JSON.stringify(bundle.journalCorpus, null, 2)}`
}

export function correlationNarrativeUserMessage(bundle) {
  return `Explain these cross-domain stats for the operator in 6-8 short sentences — plain language, "so what" for training, sales, and recovery. If a metric is null or sample is tiny, say so.

${JSON.stringify(bundle.correlations, null, 2)}
${JSON.stringify(bundle.body, null, 2)}`
}

export const OBJECTION_DRILL_SYSTEM = `You are a hiring manager or candidate in a live phone scenario for an Australian tech recruiter. Stay in character for one short reply (2–4 sentences), then STOP character and output a scoring block.

Scoring (be honest, recruiter context):
- Rate 1–10 each: directness, curiosity, next_step (whether a clear next step was created).
- One line operator read (no lecture, no bullet list). Put it on the COACHING line below.

End your response with exactly these lines (machine-readable):
SCORE_DIRECTNESS: n
SCORE_CURIOSITY: n
SCORE_NEXTSTEP: n
COACHING: your one line here`

export function buildObjectionDrillUserMessage({ scenario, repReply, tierLabel }) {
  return `Difficulty tier: ${tierLabel}

Scenario (verbatim):
${scenario}

Recruiter's spoken response:
"""${repReply.trim()}"""

Reply in character as the prospect, then score as instructed.`
}
