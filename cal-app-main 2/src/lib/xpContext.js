import { db } from '../db.js'

export async function fetchXPContext() {
  const [
    totalCheckIns, totalWorkouts, totalGoals, completedGoals,
    outboundRecords, totalWeightLogs, totalScans, totalFinanceLogs,
  ] = await Promise.all([
    db.entries.count(),
    db.workouts.count(),
    db.goals.count(),
    db.goals.filter(g => g.completed).count(),
    db.outbound.toArray(),
    db.entries.filter(e => !!e.weight).count(),
    db.scans.count(),
    db.finance.count(),
  ])
  const outboundDays = outboundRecords.length
  const totalCalls   = outboundRecords.reduce((s, r) => s + (r.calls || 0), 0)
  return {
    totalCheckIns, checkInStreak: 0,
    totalWorkouts, totalGoals, completedGoals,
    outboundDays, totalCalls,
    totalWeightLogs, totalScans, totalFinanceLogs,
  }
}
