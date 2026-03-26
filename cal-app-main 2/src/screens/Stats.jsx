import { format, subDays } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { useXP } from '../hooks/useXP'
import { useStreaks } from '../hooks/useStreaks'
import { USER } from '../theme'
import { db } from '../db'
import SectionLabel from '../components/SectionLabel'

function StatRow({ label, value, sub, color }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-realm-hairline last:border-0">
      <span className="ff-mono text-[11px] text-realm-muted uppercase tracking-wider">{label}</span>
      <div className="text-right">
        <span className="ff-mono text-[13px] tabular-nums" style={{ color: color ?? '#e5e5e5' }}>
          {value}
        </span>
        {sub && <p className="ff-mono text-[9px] text-realm-faint mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function MiniBar({ value, max, color = '#d4a853' }) {
  const pct = max ? Math.min(value / max, 1) : 0
  return (
    <div className="h-[3px] bg-realm-track w-full mt-1">
      <div className="h-full transition-all duration-700"
        style={{ width: `${pct * 100}%`, background: color }} />
    </div>
  )
}

export default function Stats() {
  const { totalXp, levelInfo }      = useXP()
  const { checkInStreak, gymStreak } = useStreaks()

  const allStats = useLiveQuery(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const w7Start  = format(subDays(new Date(), 6), 'yyyy-MM-dd')

    const [
      totalCheckIns, totalWorkouts, totalOutboundDays,
      allOutbound, allEntries7, allWorkouts7, allOutbound7,
      latestEntry, totalGoals, completedGoals, totalScans, totalFinance,
    ] = await Promise.all([
      db.entries.count(),
      db.workouts.count(),
      db.outbound.count(),
      db.outbound.toArray(),
      db.entries.where('date').between(w7Start, todayStr, true, true).toArray(),
      db.workouts.where('date').between(w7Start, todayStr, true, true).toArray(),
      db.outbound.where('date').between(w7Start, todayStr, true, true).toArray(),
      db.entries.orderBy('date').last(),
      db.goals.count(),
      db.goals.filter(g => g.completed).count(),
      db.scans.count(),
      db.finance.count(),
    ])

    const totalCalls   = allOutbound.reduce((s, r) => s + (r.calls    || 0), 0)
    const totalMeets   = allOutbound.reduce((s, r) => s + (r.meetings || 0), 0)
    const week7Calls   = allOutbound7.reduce((s, r) => s + (r.calls    || 0), 0)
    const week7Meets   = allOutbound7.reduce((s, r) => s + (r.meetings || 0), 0)
    const week7Workouts= allWorkouts7.length
    const week7CheckIns= allEntries7.length

    const latestWeight = latestEntry?.weight ?? null
    const weightToGo   = latestWeight != null ? +(latestWeight - USER.weightTarget).toFixed(1) : null
    const weightProg   = latestWeight != null
      ? Math.min(Math.max(0, (USER.weightStart - latestWeight) / (USER.weightStart - USER.weightTarget)), 1)
      : 0

    return {
      totalCheckIns, totalWorkouts, totalOutboundDays,
      totalCalls, totalMeets,
      week7Calls, week7Meets, week7Workouts, week7CheckIns,
      latestWeight, weightToGo, weightProg,
      totalGoals, completedGoals, totalScans, totalFinance,
    }
  }, [])

  const { current, next, progress, xpIntoLevel, xpForNext } = levelInfo ?? {
    current: { level: 1, title: 'Recruit' },
    next: null, progress: 0, xpIntoLevel: 0, xpForNext: 100,
  }

  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">

      <div className="mb-5">
        <h1 className="ios-title">
          STATS
        </h1>
        <p className="text-[11px] text-realm-faint mt-1">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* XP & Level */}
      <div className="mb-5">
        <SectionLabel>Rank</SectionLabel>
        <div className="ios-card">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="ff-mono text-[10px] text-realm-muted uppercase tracking-widest">Level {current.level}</p>
              <p className="ff-heading text-[24px] font-bold text-realm-gold leading-tight">
                {current.title}
              </p>
            </div>
            <p className="ff-mono text-[13px] text-realm-faint tabular-nums pb-1">
              {(totalXp ?? 0).toLocaleString()} XP
            </p>
          </div>
          <div className="h-[4px] bg-realm-track">
            <div className="h-full bg-[#d4a853] transition-all duration-700"
              style={{ width: `${progress * 100}%`, boxShadow: '0 0 6px #d4a85360' }} />
          </div>
          {next && (
            <p className="ff-mono text-[10px] text-realm-faint mt-1.5">
              {xpIntoLevel.toLocaleString()} / {xpForNext.toLocaleString()} XP → {next.title}
            </p>
          )}
        </div>
      </div>

      {/* Streaks */}
      <div className="mb-5">
        <SectionLabel>Streaks</SectionLabel>
        <div className="ios-group">
          <StatRow label="Check-in" value={`${checkInStreak} days`}
            color={checkInStreak >= 7 ? '#4ade80' : '#e5e5e5'} />
          <StatRow label="Gym"      value={`${gymStreak} sessions`}
            color={gymStreak >= 5 ? '#4ade80' : '#e5e5e5'} />
        </div>
      </div>

      {/* This week */}
      <div className="mb-5">
        <SectionLabel>This Week (7 days)</SectionLabel>
        <div className="ios-group">
          <StatRow label="Check-ins" value={allStats?.week7CheckIns ?? '—'} sub="/ 7 days" />
          <StatRow label="Workouts"  value={allStats?.week7Workouts ?? '—'} />
          <StatRow label="Calls"     value={allStats?.week7Calls    ?? '—'} />
          <StatRow label="Meetings"  value={allStats?.week7Meets    ?? '—'}
            color={(allStats?.week7Meets ?? 0) > 0 ? '#d4a853' : '#e5e5e5'} />
        </div>
      </div>

      {/* Body */}
      <div className="mb-5">
        <SectionLabel>Body</SectionLabel>
        <div className="ios-card">
          {allStats?.latestWeight != null ? (
            <>
              <div className="flex items-end justify-between mb-1">
                <div>
                  <p className="ff-mono text-[10px] text-realm-muted uppercase tracking-widest">Current Weight</p>
                  <p className="ff-mono text-[22px] font-medium text-realm-text tabular-nums">
                    {allStats.latestWeight} kg
                  </p>
                </div>
                <div className="text-right pb-1">
                  <p className="ff-mono text-[10px] text-realm-muted">Target</p>
                  <p className="ff-mono text-[13px] text-realm-faint">{USER.weightTarget} kg</p>
                </div>
              </div>
              <MiniBar
                value={Math.max(0, USER.weightStart - allStats.latestWeight)}
                max={USER.weightStart - USER.weightTarget}
                color={allStats.weightToGo <= 0 ? '#4ade80' : '#d4a853'}
              />
              <p className="ff-mono text-[10px] mt-1.5"
                style={{ color: allStats.weightToGo <= 0 ? '#4ade80' : '#525252' }}>
                {allStats.weightToGo <= 0
                  ? '✓ Target reached'
                  : `${allStats.weightToGo}kg to target`}
              </p>
            </>
          ) : (
            <p className="ff-mono text-[11px] text-[#252525] uppercase tracking-widest py-2 text-center">
              No weight logged
            </p>
          )}
        </div>
      </div>

      {/* Outbound totals */}
      <div className="mb-5">
        <SectionLabel>All-Time Outbound</SectionLabel>
        <div className="ios-group">
          <StatRow label="Total Calls"    value={(allStats?.totalCalls    ?? 0).toLocaleString()} />
          <StatRow label="Total Meetings" value={(allStats?.totalMeets    ?? 0).toLocaleString()}
            color={(allStats?.totalMeets ?? 0) > 0 ? '#d4a853' : '#525252'} />
          <StatRow label="Outbound Days"  value={allStats?.totalOutboundDays ?? 0} />
        </div>
      </div>

      {/* Activity counts */}
      <div className="mb-5">
        <SectionLabel>All-Time Activity</SectionLabel>
        <div className="ios-group">
          <StatRow label="Check-ins"      value={allStats?.totalCheckIns  ?? 0} />
          <StatRow label="Workouts"       value={allStats?.totalWorkouts  ?? 0} />
          <StatRow label="Goals set"      value={allStats?.totalGoals     ?? 0} />
          <StatRow label="Goals completed" value={allStats?.completedGoals ?? 0}
            color={(allStats?.completedGoals ?? 0) > 0 ? '#4ade80' : '#525252'} />
          <StatRow label="Body scans"     value={allStats?.totalScans     ?? 0} />
          <StatRow label="Finance logs"   value={allStats?.totalFinance   ?? 0} />
        </div>
      </div>

    </div>
  )
}
