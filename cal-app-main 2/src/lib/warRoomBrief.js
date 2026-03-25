import { format, differenceInCalendarDays, parseISO, subDays } from 'date-fns'
import { db } from '../db'

function findOteGoal(salesGoals) {
  const g = salesGoals.find((x) => /ote|on.target|commission/i.test(x.title || ''))
  return g ?? null
}

function parseNum(v) {
  if (v == null || v === '') return null
  const n = Number(String(v.replace(/[^0-9.-]/g, '')))
  return Number.isFinite(n) ? n : null
}

/** Quote + brief helpers */
export function salesOteSnapshot(salesGoals) {
  const ote = findOteGoal(salesGoals || [])
  const oteCur = parseNum(ote?.current)
  const oteTgt = parseNum(ote?.target)
  const behindOte =
    oteTgt != null && oteTgt > 0 && oteCur != null && oteCur < oteTgt * 0.95
  return { behindOte, ote }
}

/**
 * Deterministic daily brief from live Dexie (no LLM). FORGE voice: signal first, flat, no fluff.
 */
export function buildWarRoomBrief(ctx) {
  const {
    campaignStartDate,
    todayStr,
    salesGoals,
    weekCalls,
    weekMeetings,
    yesterdayMood,
    gymStreak,
    outboundStreak,
    defaultDialTarget,
    trainingStreak,
  } = ctx

  const dayName = format(new Date(), 'EEEE')
  let runDay = 1
  try {
    runDay =
      differenceInCalendarDays(parseISO(`${todayStr}T12:00:00`), parseISO(`${campaignStartDate}T12:00:00`)) + 1
    if (!Number.isFinite(runDay) || runDay < 1) runDay = 1
  } catch {
    runDay = 1
  }

  const ote = findOteGoal(salesGoals || [])
  const oteCur = parseNum(ote?.current)
  const oteTgt = parseNum(ote?.target)
  const unit = (ote?.unit || '').trim()
  const behindOte =
    oteTgt != null && oteTgt > 0 && oteCur != null && oteCur < oteTgt * 0.95

  const lowYesterday = yesterdayMood === 'DRAINED' || yesterdayMood === 'COOKED'
  const streakLine =
    (gymStreak ?? 0) >= 3
      ? `Training streak ${gymStreak}d — hold it.`
      : (outboundStreak ?? 0) >= 5
        ? `Outbound log streak ${outboundStreak}d — don’t drop it.`
        : null

  const energy =
    yesterdayMood === 'DIALED'
      ? 'Yesterday: DIALED. Press today.'
      : lowYesterday
        ? 'Yesterday: heavy mood. Smaller win still clears the bar.'
        : yesterdayMood
          ? `Yesterday mood ${yesterdayMood}. Pick a lane and run.`
          : 'No yesterday mood — set it on check-in.'

  const oteLine =
    oteTgt != null
      ? `OTE read: ${oteCur ?? 0}${unit ? ` ${unit}` : ''} / ${oteTgt}${unit ? ` ${unit}` : ''}.` +
        (behindOte ? ' Behind — dials are the lever.' : ' On pace — add a meeting if there’s window.')
      : 'No OTE-style goal logged — add one to track comp progress.'

  const meetingOrder =
    weekMeetings < 2
      ? 'Meetings light this week — book one today if the window’s open.'
      : 'Meetings moving — squeeze one more before week close.'

  const trainBit =
    (trainingStreak ?? 0) >= 3 ? `${trainingStreak} sessions logged in a row.` : null

  const parts = [
    `${dayName}. Run day ${runDay}.`,
    oteLine,
    `Week to date: ${weekCalls ?? 0} dials · ${weekMeetings ?? 0} meetings.`,
    energy,
  ]
  if (streakLine) parts.push(streakLine)
  if (trainBit) parts.push(trainBit)
  parts.push(`Dial target today: ${defaultDialTarget}.`, meetingOrder)

  return parts.join(' ')
}

export async function loadYesterdayMood() {
  const y = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const e = await db.entries.get(y)
  return e?.moodWord ?? e?.mood ?? null
}
