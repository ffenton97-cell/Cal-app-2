/**
 * Cross-domain analytics from Dexie — Command UI + FORGE context.
 */
import {
  format,
  subDays,
  parseISO,
  startOfWeek,
  endOfWeek,
  subWeeks,
  differenceInCalendarDays,
  getDay,
} from 'date-fns'
import { db } from '../db'
import { USER, GYM_SCHEDULE } from '../theme.js'

function payDatesFromAnchor(anchorStr, intervalDays, count = 24) {
  const anchor = parseISO(`${anchorStr}T12:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let d = new Date(anchor)
  const out = []
  let guard = 0
  while (guard++ < 400 && out.length < count) {
    const ds = format(d, 'yyyy-MM-dd')
    out.push(ds)
    d = new Date(d)
    d.setDate(d.getDate() + intervalDays)
  }
  return out
}

function isPayWeek(dateStr, payDates) {
  const t = parseISO(`${dateStr}T12:00:00`)
  for (const p of payDates) {
    const pd = parseISO(`${p}T12:00:00`)
    const diff = differenceInCalendarDays(t, pd)
    if (diff >= 0 && diff < 7) return true
  }
  return false
}

export function getLastCompletedCalendarWeek() {
  const ref = subWeeks(new Date(), 1)
  const start = startOfWeek(ref, { weekStartsOn: 1 })
  const end = endOfWeek(ref, { weekStartsOn: 1 })
  return {
    startStr: format(start, 'yyyy-MM-dd'),
    endStr: format(end, 'yyyy-MM-dd'),
    label: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`,
  }
}

export function getPriorCalendarWeek() {
  const ref = subWeeks(new Date(), 2)
  const start = startOfWeek(ref, { weekStartsOn: 1 })
  const end = endOfWeek(ref, { weekStartsOn: 1 })
  return {
    startStr: format(start, 'yyyy-MM-dd'),
    endStr: format(end, 'yyyy-MM-dd'),
    label: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`,
  }
}

function workoutTonnage(w) {
  if (!w?.exercises?.length) return 0
  let t = 0
  for (const ex of w.exercises) {
    for (const s of ex.sets || []) {
      const reps = typeof s.reps === 'number' ? s.reps : parseFloat(s.reps) || 0
      const wt = typeof s.weight === 'number' ? s.weight : parseFloat(s.weight) || 0
      if (reps > 0 && wt > 0) t += reps * wt
    }
  }
  return Math.round(t)
}

function lastBenchSummary(workouts) {
  let best = null
  for (const w of workouts) {
    const name = (w.type || '').toLowerCase()
    const exs = w.exercises || []
    for (const ex of exs) {
      const n = (ex.name || '').toLowerCase()
      if (!n.includes('bench') && !name.includes('push')) continue
      for (const s of ex.sets || []) {
        const reps = typeof s.reps === 'number' ? s.reps : parseFloat(s.reps) || 0
        const wt = typeof s.weight === 'number' ? s.weight : parseFloat(s.weight) || 0
        if (reps >= 3 && wt > 0 && (!best || wt > best.weight)) {
          best = { weight: wt, reps, date: w.date, exercise: ex.name }
        }
      }
    }
  }
  return best
}

/** Structured weekly metrics for UI + FORGE synthesis */
export async function weeklyPerformanceDigest(weekStartStr, weekEndStr) {
  const [entries, workouts, outbound, financeAll] = await Promise.all([
    db.entries.where('date').between(weekStartStr, weekEndStr, true, true).toArray(),
    db.workouts.where('date').between(weekStartStr, weekEndStr, true, true).toArray(),
    db.outbound.where('date').between(weekStartStr, weekEndStr, true, true).toArray(),
    db.finance.orderBy('date').toArray(),
  ])

  const weights = entries.map((e) => e.weight).filter((w) => w != null && w > 0)
  const avgWeight =
    weights.length > 0 ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10 : null

  let calHit = 0
  let protHit = 0
  const moodCount = {}
  const wins = []
  for (const e of entries) {
    if (e.cals != null && e.cals >= USER.cutCals * 0.88) calHit++
    if (e.protein != null && e.protein >= USER.cutProtein * 0.88) protHit++
    const m = e.mood || e.moodWord
    if (m) moodCount[m] = (moodCount[m] || 0) + 1
    if (e.win?.trim()) wins.push(e.win.trim())
  }

  const gymFlags = entries.filter((e) => e.gym).length
  const sessionsLogged = workouts.length

  const calls = outbound.reduce((s, o) => s + (o.calls || 0), 0)
  const connected = outbound.reduce((s, o) => s + (o.connected || 0), 0)
  const convos = outbound.reduce((s, o) => s + (o.convos || 0), 0)
  const meetings = outbound.reduce((s, o) => s + (o.meetings || 0), 0)
  const emails = outbound.reduce((s, o) => s + (o.emails || 0), 0)

  let bestDay = null
  let bestCalls = -1
  for (const o of outbound) {
    const c = o.calls || 0
    if (c > bestCalls) {
      bestCalls = c
      bestDay = o.date
    }
  }

  const finInWeek = financeAll.filter((f) => f.date >= weekStartStr && f.date <= weekEndStr)
  const nwSeries = finInWeek
    .map((f) => {
      const assets = (f.cash || 0) + (f.super || 0) + (f.invest || 0) + (f.propval || 0)
      const liab = (f.mortgage || 0) + (f.hecs || 0)
      return { date: f.date, nw: assets - liab, income: f.income, expenses: f.expenses }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  let nwDelta = null
  if (nwSeries.length >= 2) {
    nwDelta = nwSeries[nwSeries.length - 1].nw - nwSeries[0].nw
  }

  const goals = await db.goals.filter((g) => !g.completed).toArray()
  const goalWeekDeltas = goals.map((g) => {
    const h = g.history || []
    const inWeek = h.filter((x) => x.date >= weekStartStr && x.date <= weekEndStr)
    const startVal = g.start
    const endVal = inWeek.length ? inWeek[inWeek.length - 1].value : g.current
    const delta = endVal != null && startVal != null ? endVal - startVal : null
    const pct =
      g.target != null && startVal != null && Math.abs(g.target - startVal) > 1e-6
        ? Math.round(((endVal - startVal) / (g.target - startVal)) * 1000) / 10
        : null
    return { title: g.title, unit: g.unit, delta, pctOfSpanTowardTarget: pct }
  })

  return {
    range: { start: weekStartStr, end: weekEndStr },
    body: {
      daysWithCheckIn: entries.length,
      avgWeightKg: avgWeight,
      calorieTargetHitDays: calHit,
      proteinTargetHitDays: protHit,
      gymFlags,
      workoutSessionsLogged: sessionsLogged,
    },
    sales: {
      outboundDaysLogged: outbound.length,
      totalCalls: calls,
      connected,
      convos,
      meetingsBooked: meetings,
      emails,
      connectRate: calls ? Math.round((connected / calls) * 1000) / 10 : null,
      convoRate: calls ? Math.round((convos / calls) * 1000) / 10 : null,
      meetingRate: calls ? Math.round((meetings / calls) * 1000) / 10 : null,
      bestDialDay: bestDay,
      bestDialCount: bestCalls >= 0 ? bestCalls : null,
    },
    finance: {
      snapshotsInWeek: finInWeek.length,
      netWorthDeltaIfTracked: nwDelta,
      series: nwSeries,
    },
    mindset: {
      moodCounts: moodCount,
      winSnippets: wins.slice(0, 12),
    },
    goals: goalWeekDeltas,
  }
}

export async function compareWeeksDigest(currentStart, currentEnd, priorStart, priorEnd) {
  const [a, b] = await Promise.all([
    weeklyPerformanceDigest(currentStart, currentEnd),
    weeklyPerformanceDigest(priorStart, priorEnd),
  ])
  return { current: a, prior: b }
}

/** Join entries + outbound by date for correlation heuristics */
export async function correlationInsights(lookbackDays = 42) {
  const end = format(new Date(), 'yyyy-MM-dd')
  const start = format(subDays(new Date(), lookbackDays), 'yyyy-MM-dd')
  const [entries, outbound, workouts] = await Promise.all([
    db.entries.where('date').between(start, end, true, true).toArray(),
    db.outbound.where('date').between(start, end, true, true).toArray(),
    db.workouts.where('date').between(start, end, true, true).toArray(),
  ])

  const byDate = {}
  for (const e of entries) {
    byDate[e.date] = { ...byDate[e.date], entry: e }
  }
  for (const o of outbound) {
    byDate[o.date] = { ...byDate[o.date], out: o }
  }
  for (const w of workouts) {
    byDate[w.date] = { ...byDate[w.date], workout: w, tonnage: workoutTonnage(w) }
  }

  const payDates = payDatesFromAnchor(USER.paydayAnchor, USER.paydayInterval, 40)

  const moodDial = { calls: [], vol: [] }
  const moodCooked = { calls: [], vol: [] }
  const calsVsNextTonnage = []

  const dates = Object.keys(byDate).sort()
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i]
    const row = byDate[d]
    const mood = row.entry?.mood || row.entry?.moodWord
    const calls = row.out?.calls || 0
    if (mood === 'DIALED' || mood === 'SOLID') moodDial.calls.push(calls)
    if (mood === 'COOKED' || mood === 'DRAINED') moodCooked.calls.push(calls)

    const next = dates[i + 1]
    if (next && row.entry?.cals != null) {
      const nextRow = byDate[next]
      if (nextRow?.tonnage) {
        calsVsNextTonnage.push({ cals: row.entry.cals, tonnageNext: nextRow.tonnage })
      }
    }
  }

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
  const dialAvg = avg(moodDial.calls)
  const cookedAvg = avg(moodCooked.calls)
  const pctDiff =
    dialAvg && cookedAvg && cookedAvg > 0
      ? Math.round(((dialAvg - cookedAvg) / cookedAvg) * 100)
      : null

  let postPayCalls = []
  let otherCalls = []
  for (const d of dates) {
    const row = byDate[d]
    const c = row.out?.calls
    if (c == null) continue
    if (isPayWeek(d, payDates)) postPayCalls.push(c)
    else otherCalls.push(c)
  }

  const payWeekAvg = avg(postPayCalls)
  const otherAvg = avg(otherCalls)
  const payRhythmPct =
    otherAvg && payWeekAvg != null && otherAvg > 0
      ? Math.round(((payWeekAvg - otherAvg) / otherAvg) * 100)
      : null

  let proteinBf = null
  const scans = await db.scans.orderBy('date').toArray()
  if (scans.length >= 2) {
    const last = scans[scans.length - 1]
    const prev = scans[scans.length - 2]
    const wStart = prev.date
    const wEnd = last.date
    const ent = await db.entries.where('date').between(wStart, wEnd, true, true).toArray()
    const proteins = ent.map((e) => e.protein).filter((p) => p != null && p > 0)
    const avgProt = proteins.length ? proteins.reduce((a, b) => a + b, 0) / proteins.length : null
    const bfDelta = last.bf != null && prev.bf != null ? last.bf - prev.bf : null
    proteinBf = { avgProteinBetweenScans: avgProt, bfDeltaPoints: bfDelta, scanGapDays: differenceInCalendarDays(parseISO(`${last.date}T12:00:00`), parseISO(`${prev.date}T12:00:00`)) }
  }

  return {
    window: { start, end, days: lookbackDays },
    moodVsDials: {
      avgCallsOnDialedSolidDays: dialAvg != null ? Math.round(dialAvg * 10) / 10 : null,
      avgCallsOnCookedDrainedDays: cookedAvg != null ? Math.round(cookedAvg * 10) / 10 : null,
      pctMoreDialsWhenDialedVsLowMood: pctDiff,
    },
    nutritionVsNextDayTonnage: {
      sampleDays: calsVsNextTonnage.length,
      note: 'Calories logged day N vs workout tonnage day N+1 (when both exist)',
    },
    payRhythm: {
      avgCallsInPayWeek: payWeekAvg != null ? Math.round(payWeekAvg * 10) / 10 : null,
      avgCallsOtherWeeks: otherAvg != null ? Math.round(otherAvg * 10) / 10 : null,
      pctDiffPayWeekVsBaseline: payRhythmPct,
    },
    proteinVsBodyComp: proteinBf,
  }
}

export async function salesPipelineIntel(lookbackDays = 28) {
  const end = format(new Date(), 'yyyy-MM-dd')
  const start = format(subDays(new Date(), lookbackDays), 'yyyy-MM-dd')
  const rows = await db.outbound.where('date').between(start, end, true, true).toArray()
  const calls = rows.reduce((s, r) => s + (r.calls || 0), 0)
  const connected = rows.reduce((s, r) => s + (r.connected || 0), 0)
  const convos = rows.reduce((s, r) => s + (r.convos || 0), 0)
  const meetings = rows.reduce((s, r) => s + (r.meetings || 0), 0)

  const byDow = {}
  for (const r of rows) {
    const dow = getDay(parseISO(`${r.date}T12:00:00`))
    if (!byDow[dow]) byDow[dow] = { calls: 0, meetings: 0, days: 0 }
    byDow[dow].calls += r.calls || 0
    byDow[dow].meetings += r.meetings || 0
    if ((r.calls || 0) > 0) byDow[dow].days += 1
  }
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dowAnalysis = Object.entries(byDow).map(([d, v]) => ({
    day: dowNames[Number(d)],
    avgCallsWhenLogged: v.days ? Math.round((v.calls / v.days) * 10) / 10 : 0,
    meetings: v.meetings,
  }))

  const last8 = format(subDays(new Date(), 8), 'yyyy-MM-dd')
  const recentMeetings = rows.filter((r) => r.date >= last8).reduce((s, r) => s + (r.meetings || 0), 0)
  const prior = rows.filter((r) => r.date < last8)
  const priorMeetRate =
    prior.length > 0 ? prior.reduce((s, r) => s + (r.meetings || 0), 0) / (prior.length / 2) : null

  return {
    window: { start, end },
    funnel: {
      dials: calls,
      connected,
      convos,
      meetings,
      pctConnected: calls ? Math.round((connected / calls) * 1000) / 10 : null,
      pctConvos: calls ? Math.round((convos / calls) * 1000) / 10 : null,
      pctMeetings: calls ? Math.round((meetings / calls) * 1000) / 10 : null,
    },
    dayOfWeek: dowAnalysis,
    momentum: {
      meetingsLast8Days: recentMeetings,
      note: 'Compare to your historical average in UI narrative',
    },
    costPerMeeting: meetings && calls ? Math.round((calls / meetings) * 10) / 10 : null,
  }
}

export async function bodyCompositionIntel() {
  const entries = await db.entries
    .filter((e) => e.weight != null && e.weight > 0)
    .toArray()
  const sorted = entries.sort((a, b) => a.date.localeCompare(b.date))
  const last7 = sorted.slice(-7)
  const roll7 =
    last7.length > 0
      ? Math.round((last7.reduce((s, e) => s + e.weight, 0) / last7.length) * 10) / 10
      : null

  const last21 = sorted.slice(-21)
  const w21Delta =
    last21.length >= 2 ? Math.round((last21[last21.length - 1].weight - last21[0].weight) * 10) / 10 : null

  const scans = await db.scans.orderBy('date').toArray()
  const latest = scans[scans.length - 1]

  const cutPhase = USER.weightTarget < USER.weightStart
  let directionAlert = null
  if (cutPhase && w21Delta != null && w21Delta > 0.4) {
    directionAlert = `Weight up ~${w21Delta}kg over ~21d while cut target is ${USER.weightTarget}kg — verify logging / intake.`
  }

  return {
    rollingAvgWeight7d: roll7,
    weightDeltaApprox21d: w21Delta,
    latestScan: latest
      ? { date: latest.date, bf: latest.bf, weight: latest.weight }
      : null,
    directionAlert,
    cutPhaseActive: cutPhase,
  }
}

export async function financeOperatingIntel() {
  const rows = await db.finance.orderBy('date').toArray()
  if (rows.length < 2) {
    return { snapshots: rows.length, velocity: null, hecs: null }
  }
  const nw = (f) => {
    const assets = (f.cash || 0) + (f.super || 0) + (f.invest || 0) + (f.propval || 0)
    const liab = (f.mortgage || 0) + (f.hecs || 0)
    return assets - liab
  }
  const latest = rows[rows.length - 1]
  const prev = rows[rows.length - 2]
  const days = Math.max(
    1,
    differenceInCalendarDays(parseISO(`${latest.date}T12:00:00`), parseISO(`${prev.date}T12:00:00`)),
  )
  const nwVel = (nw(latest) - nw(prev)) / days
  const monthlyNWVelocity = Math.round(nwVel * 30)

  const inc = latest.income != null && latest.expenses != null ? latest.income - latest.expenses : null
  const hecs = latest.hecs

  return {
    snapshots: rows.length,
    latestDate: latest.date,
    netWorth: nw(latest),
    monthlyNWVelocityApprox: monthlyNWVelocity,
    lastSnapshotSurplus: inc,
    hecsBalance: hecs,
    note: 'Velocity = linear extrapolation between last two snapshots only.',
  }
}

export async function goalTrajectories() {
  const goals = await db.goals.filter((g) => !g.completed).toArray()
  const today = new Date()
  return goals.map((g) => {
    const start = g.start ?? 0
    const cur = g.current ?? start
    const tgt = g.target
    const deadline = g.deadline ? parseISO(`${g.deadline}T12:00:00`) : null
    const daysLeft = deadline ? differenceInCalendarDays(deadline, today) : null
    const span = tgt - start
    const done = cur - start
    const paceNeeded =
      daysLeft != null && daysLeft > 0 && Math.abs(span) > 1e-6
        ? (tgt - cur) / daysLeft
        : null
    const history = g.history || []
    let weeklyRate = null
    if (history.length >= 2) {
      const a = history[history.length - 2]
      const b = history[history.length - 1]
      const dd = differenceInCalendarDays(parseISO(`${b.date}T12:00:00`), parseISO(`${a.date}T12:00:00`))
      if (dd > 0) weeklyRate = ((b.value - a.value) / dd) * 7
    }
    const onTrack =
      paceNeeded != null && weeklyRate != null
        ? span > 0
          ? weeklyRate >= paceNeeded * 0.85
          : weeklyRate <= paceNeeded * 1.15
        : null

    return {
      title: g.title,
      unit: g.unit,
      start,
      current: cur,
      target: tgt,
      deadline: g.deadline,
      daysLeft,
      requiredPerDayToHit: paceNeeded != null ? Math.round(paceNeeded * 100) / 100 : null,
      impliedWeeklyFromLastLogs: weeklyRate != null ? Math.round(weeklyRate * 100) / 100 : null,
      onTrackHeuristic: onTrack,
    }
  })
}

export async function taskIntelligence() {
  const todos = await db.todos.filter((t) => !t.done).toArray()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const score = (t) => {
    let s = 0
    if (t.priority === 'HIGH') s += 4
    else if (t.priority === 'MED') s += 2
    if (t.due && t.due < todayStr) s += 5
    else if (t.due === todayStr) s += 4
    else if (t.due) {
      const d = differenceInCalendarDays(parseISO(`${t.due}T12:00:00`), parseISO(`${todayStr}T12:00:00`))
      if (d <= 3) s += 2
    }
    const cat = (t.category || '').toUpperCase()
    if (cat.includes('SALES')) s += 3
    if ((t.title || '').toUpperCase().includes('OUTBOUND')) s += 2
    if ((t.title || '').toUpperCase().includes('OTE')) s += 2
    return s
  }
  const ranked = [...todos].sort((a, b) => score(b) - score(a))
  const outboundTodoMissed = todos.filter(
    (t) =>
      (t.title || '').toLowerCase().includes('outbound') &&
      t.due &&
      t.due < todayStr,
  ).length

  return {
    rankedTop: ranked.slice(0, 12).map((t) => ({
      title: t.title,
      due: t.due,
      priority: t.priority,
      category: t.category,
      score: score(t),
    })),
    overdueOutboundLogTasksApprox: outboundTodoMissed,
  }
}

export async function journalCorpus(days = 90) {
  const start = format(subDays(new Date(), days), 'yyyy-MM-dd')
  const notes = await db.dayNotes.where('date').aboveOrEqual(start).toArray()
  const wins = await db.entries.where('date').aboveOrEqual(start).toArray()
  const journalTexts = notes
    .map((n) => ({ date: n.date, text: n.notes?.[0] }))
    .filter((x) => x.text)
  const winTexts = wins.map((e) => e.win).filter(Boolean)
  return { journalTexts, winTexts, since: start }
}

export async function monthlyRawDigest(yearMonth) {
  // yearMonth 'yyyy-MM' optional; default last 30d as pseudo-month
  const end = format(new Date(), 'yyyy-MM-dd')
  const start = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const entries = await db.entries.where('date').between(start, end, true, true).toArray()
  const outbound = await db.outbound.where('date').between(start, end, true, true).toArray()
  const { journalTexts, winTexts } = await journalCorpus(30)
  return {
    label: 'Last ~30 days',
    start,
    end,
    checkIns: entries.length,
    outboundDays: outbound.length,
    totalCalls: outbound.reduce((s, o) => s + (o.calls || 0), 0),
    journalEntryCount: journalTexts.length,
    winOfDayCount: winTexts.length,
  }
}

export async function morningBriefSupplement() {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const dow = getDay(parseISO(`${todayStr}T12:00:00`))
  const gymTime = GYM_SCHEDULE[dow]
  const recentWorkouts = await db.workouts
    .orderBy('date')
    .reverse()
    .limit(14)
    .toArray()
  const bench = lastBenchSummary(recentWorkouts)

  let proteinSum = 0
  let proteinN = 0
  for (let i = 0; i < 5; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    const e = await db.entries.get(d)
    if (e?.protein != null) {
      proteinSum += e.protein
      proteinN++
    }
  }
  const protein5dAvg = proteinN ? Math.round((proteinSum / proteinN) * 10) / 10 : null

  const todosToday = (await db.todos.where('due').equals(todayStr).toArray()).filter((t) => !t.done)

  const last7 = format(subDays(new Date(), 7), 'yyyy-MM-dd')
  const ob = await db.outbound.where('date').between(last7, todayStr, true, true).toArray()
  const meetings7d = ob.reduce((s, o) => s + (o.meetings || 0), 0)

  const drained = []
  for (let i = 0; i < 5; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    const e = await db.entries.get(d)
    const m = e?.mood || e?.moodWord
    if (m === 'DRAINED' || m === 'COOKED') drained.push(d)
  }

  const payDates = payDatesFromAnchor(USER.paydayAnchor, USER.paydayInterval, 8)
  const isPayday = payDates.includes(todayStr)

  const financeRows = await db.finance.orderBy('date').reverse().limit(2).toArray()
  let spendNote = null
  if (financeRows.length >= 2) {
    const a = financeRows[1]
    const b = financeRows[0]
    if (a.income != null && a.expenses != null && b.income != null && b.expenses != null) {
      spendNote = { priorSurplus: a.income - a.expenses, latestSurplus: b.income - b.expenses }
    }
  }

  return {
    todayStr,
    dow,
    gymScheduled: gymTime ? { time: gymTime } : null,
    lastBench: bench,
    protein5dAvg,
    proteinTarget: USER.cutProtein,
    todosDueToday: todosToday.map((t) => ({ title: t.title, priority: t.priority })),
    meetingsBookedLast7Days: meetings7d,
    lowMoodLast5Days: drained.length,
    isPayday,
    financeSurplusCompare: spendNote,
  }
}

/** Full bundle for Field Command page */
export async function loadFieldCommandBundle() {
  const wk = getLastCompletedCalendarWeek()
  const pw = getPriorCalendarWeek()
  const [weekCompare, correlations, sales, body, finance, goals, tasks, month, corpus] =
    await Promise.all([
      compareWeeksDigest(wk.startStr, wk.endStr, pw.startStr, pw.endStr),
      correlationInsights(42),
      salesPipelineIntel(28),
      bodyCompositionIntel(),
      financeOperatingIntel(),
      goalTrajectories(),
      taskIntelligence(),
      monthlyRawDigest(),
      journalCorpus(90),
    ])

  return {
    generatedAt: new Date().toISOString(),
    lastWeekLabel: wk.label,
    priorWeekLabel: pw.label,
    weekCompare,
    correlations,
    sales,
    body,
    finance,
    goals,
    tasks,
    month,
    journalCorpus: {
      count: corpus.journalTexts.length,
      winsSample: corpus.winTexts.slice(-15),
      journalSample: corpus.journalTexts.slice(-14),
    },
  }
}
