import {
  format,
  parseISO,
  startOfISOWeek,
  endOfISOWeek,
  eachDayOfInterval,
  subWeeks,
  getISOWeek,
  getISOWeekYear,
} from 'date-fns'
import { db } from '../db'
import { awardXP } from '../hooks/useXP'
import { XP } from '../theme'

const ID = 'singleton'

export function isoWeekKey(d) {
  return `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`
}

export async function getOrInitSalesUX() {
  let row = await db.salesUX.get(ID)
  const today = format(new Date(), 'yyyy-MM-dd')
  if (!row) {
    const firstOut = await db.outbound.orderBy('date').first()
    row = {
      id: ID,
      campaignStartDate: firstOut?.date ?? today,
      drillStreak: 0,
      lastDrillDate: null,
      lastDrillXpDay: null,
      enemyMode: 'benchmark',
      enemyName: 'REP-1',
      enemyBenchDials: 55,
      enemyBenchMeetings: 3,
      pbWeekDials: 0,
      pbWeekMeetings: 0,
      enemyLastCheckedWeekKey: null,
      sessionDialTarget: null,
      sessionIntention: null,
      sessionStartedAt: null,
      sessionDay: null,
      sessionLockXpDay: null,
      enemyBoardEnabled: true,
    }
    await db.salesUX.put(row)
  }
  if (row.sessionDay && row.sessionDay !== today) {
    row = {
      ...row,
      sessionDialTarget: null,
      sessionIntention: null,
      sessionStartedAt: null,
      sessionDay: null,
    }
    await db.salesUX.put(row)
  }
  return row
}

export async function updateSalesUX(partial) {
  const cur = await getOrInitSalesUX()
  await db.salesUX.put({ ...cur, ...partial })
}

export async function aggregateOutboundForISOWeek(weekRefDate) {
  const start = format(startOfISOWeek(weekRefDate), 'yyyy-MM-dd')
  const end = format(endOfISOWeek(weekRefDate), 'yyyy-MM-dd')
  const days = eachDayOfInterval({
    start: parseISO(`${start}T12:00:00`),
    end: parseISO(`${end}T12:00:00`),
  })
  let calls = 0
  let meetings = 0
  for (const d of days) {
    const ds = format(d, 'yyyy-MM-dd')
    const r = await db.outbound.get(ds)
    if (r) {
      calls += r.calls || 0
      meetings += r.meetings || 0
    }
  }
  return { calls, meetings, start, end }
}

/** Scan recent ISO weeks to refresh personal-best rolling totals (Mon–Sun). */
export async function recomputePbWeek() {
  const ux = await getOrInitSalesUX()
  let bestC = 0
  let bestM = 0
  for (let w = 0; w < 26; w++) {
    const anchor = startOfISOWeek(subWeeks(new Date(), w))
    const { calls, meetings } = await aggregateOutboundForISOWeek(anchor)
    if (calls > bestC || (calls === bestC && meetings > bestM)) {
      bestC = calls
      bestM = meetings
    }
  }
  if (bestC !== ux.pbWeekDials || bestM !== ux.pbWeekMeetings) {
    await updateSalesUX({ pbWeekDials: bestC, pbWeekMeetings: bestM })
  }
  return { pbWeekDials: bestC, pbWeekMeetings: bestM }
}

/**
 * When the ISO week rolls forward, score the completed prior week vs enemy.
 * Awards +25 XP once per rollover if you beat both dial and meeting bars.
 */
export async function maybeResolveEnemyWeek(onXP) {
  const now = new Date()
  const thisKey = isoWeekKey(now)
  const ux = await getOrInitSalesUX()

  if (ux.enemyLastCheckedWeekKey === thisKey) return null

  if (ux.enemyLastCheckedWeekKey == null) {
    await updateSalesUX({ enemyLastCheckedWeekKey: thisKey })
    return null
  }

  const prevWeekStart = startOfISOWeek(subWeeks(now, 1))
  const stats = await aggregateOutboundForISOWeek(prevWeekStart)

  const ed =
    ux.enemyMode === 'personal_best'
      ? Math.max(ux.enemyBenchDials ?? 0, ux.pbWeekDials ?? 0, 1)
      : ux.enemyBenchDials ?? 55
  const em =
    ux.enemyMode === 'personal_best'
      ? Math.max(ux.enemyBenchMeetings ?? 0, ux.pbWeekMeetings ?? 0, 0)
      : ux.enemyBenchMeetings ?? 3

  const won = stats.calls >= ed && stats.meetings >= em

  if (won) {
    const [outboundDays, allRecords, totalCheckIns, totalWorkouts, totalGoals, completedGoals, totalWeightLogs, totalScans, totalFinanceLogs] =
      await Promise.all([
        db.outbound.count(),
        db.outbound.toArray(),
        db.entries.count(),
        db.workouts.count(),
        db.goals.count(),
        db.goals.filter((g) => g.completed).count(),
        db.entries.filter((e) => !!e.weight).count(),
        db.scans.count(),
        db.finance.count(),
      ])
    const totalCalls = allRecords.reduce((s, r) => s + (r.calls || 0), 0)
    await awardXP(XP.enemyDefeated, {
      outboundDays,
      totalCalls,
      totalCheckIns,
      checkInStreak: 0,
      totalWorkouts,
      totalGoals,
      completedGoals,
      totalWeightLogs,
      totalScans,
      totalFinanceLogs,
    })
    onXP?.({ amount: XP.enemyDefeated, achievement: null })

    const next = {
      ...ux,
      enemyLastCheckedWeekKey: thisKey,
      enemyBenchDials: stats.calls,
      enemyBenchMeetings: stats.meetings,
    }
    await db.salesUX.put(next)
    await recomputePbWeek()
    return { defeated: true, stats, enemy: { dials: ed, meetings: em } }
  }

  await updateSalesUX({ enemyLastCheckedWeekKey: thisKey })
  await recomputePbWeek()
  return { defeated: false, stats, enemy: { dials: ed, meetings: em } }
}

export function enemyTargets(ux) {
  if (!ux) return { dials: 55, meetings: 3 }
  if (ux.enemyMode === 'personal_best') {
    return {
      dials: Math.max(ux.enemyBenchDials ?? 0, ux.pbWeekDials ?? 0, 1),
      meetings: Math.max(ux.enemyBenchMeetings ?? 0, ux.pbWeekMeetings ?? 0, 0),
    }
  }
  return {
    dials: ux.enemyBenchDials ?? 55,
    meetings: ux.enemyBenchMeetings ?? 3,
  }
}
