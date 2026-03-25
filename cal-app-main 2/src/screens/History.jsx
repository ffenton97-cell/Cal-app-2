import { format, subDays, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

const MOOD_COLORS = {
  DIALED:  '#4ade80',
  SOLID:   '#d4a853',
  STEADY:  '#8a8a8a',
  DRAINED: '#fb923c',
  COOKED:  '#f87171',
}

export default function History() {
  // Last 60 days of entries + matching workouts + outbound
  const entries = useLiveQuery(async () => {
    const start = format(subDays(new Date(), 59), 'yyyy-MM-dd')
    const today = format(new Date(), 'yyyy-MM-dd')
    const [ents, works, outs] = await Promise.all([
      db.entries.where('date').between(start, today, true, true).toArray(),
      db.workouts.where('date').between(start, today, true, true).toArray(),
      db.outbound.where('date').between(start, today, true, true).toArray(),
    ])
    // Index by date
    const workMap = Object.fromEntries(works.map(w => [w.date, w]))
    const outMap  = Object.fromEntries(outs.map(o => [o.date, o]))
    return ents
      .map(e => ({ ...e, workout: workMap[e.date], outbound: outMap[e.date] }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [])

  if (!entries) {
    return (
      <div className="px-4 pt-4">
        <h1 className="ff-heading text-[20px] font-semibold tracking-tight text-[#f5f0f0]">Log</h1>
        <p className="forge-mono mt-6 text-[10px] text-[rgba(255,255,255,0.18)]">loading…</p>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="px-4 pt-4 max-w-lg mx-auto">
        <h1 className="ff-heading mb-1 text-[20px] font-semibold leading-none tracking-tight text-[#f5f0f0]">
          Log
        </h1>
        <p className="forge-mono text-[10px] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.18)]">
          Last 60 days
        </p>
        <div className="py-16 text-center">
          <p className="text-[12px] text-[rgba(255,255,255,0.32)]">No rows</p>
          <p className="mt-1 text-[11px] text-[rgba(255,255,255,0.18)]">Check-in to populate.</p>
        </div>
      </div>
    )
  }

  // Group by month
  const grouped = {}
  for (const e of entries) {
    const month = format(parseISO(e.date), 'MMMM yyyy')
    if (!grouped[month]) grouped[month] = []
    grouped[month].push(e)
  }

  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">

      <div className="mb-5">
        <h1 className="ff-heading text-[20px] font-semibold leading-none tracking-tight text-[#f5f0f0]">
          Log
        </h1>
        <p className="forge-mono mt-1 text-[10px] tracking-[0.08em] text-[rgba(255,255,255,0.18)]">
          Last 60 days · {entries.length} entries
        </p>
      </div>

      {/* column headers */}
      <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr_1fr] gap-1 px-2 mb-2">
        {['Date', 'Wt', 'Cal', 'Pro', 'Gym', 'Mood'].map(h => (
          <span key={h} className="ff-mono text-[9px] text-realm-faint uppercase tracking-wider">
            {h}
          </span>
        ))}
      </div>

      {Object.entries(grouped).map(([month, rows]) => (
        <div key={month} className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="ff-mono text-[10px] tracking-[0.2em] text-realm-gold uppercase">
              {month}
            </span>
            <div className="flex-1 h-px bg-realm-border" />
          </div>

          <div className="border border-realm-border divide-y divide-realm-hairline">
            {rows.map(e => {
              const isToday = e.date === format(new Date(), 'yyyy-MM-dd')
              const moodColor = MOOD_COLORS[e.moodWord] ?? '#525252'
              const dateLabel = isToday
                ? 'Today'
                : format(parseISO(e.date), 'EEE d')
              return (
                <div
                  key={e.date}
                  className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr_1fr] gap-1 px-2 py-2 items-center"
                  style={{ backgroundColor: isToday ? '#d4a85308' : undefined }}
                >
                  <span className="ff-mono text-[11px]"
                    style={{ color: isToday ? '#d4a853' : '#8a8a8a' }}>
                    {dateLabel}
                  </span>
                  <span className="ff-mono text-[11px] text-realm-text tabular-nums">
                    {e.weight ?? '—'}
                  </span>
                  <span className="ff-mono text-[11px] text-realm-muted tabular-nums">
                    {e.cals ?? '—'}
                  </span>
                  <span className="ff-mono text-[11px] text-realm-muted tabular-nums">
                    {e.protein ? `${e.protein}g` : '—'}
                  </span>
                  <span className="ff-mono text-[11px]"
                    style={{ color: e.gym ? '#4ade80' : '#2a2a2a' }}>
                    {e.gym ? '✓' : '—'}
                  </span>
                  <span className="ff-mono text-[10px] truncate"
                    style={{ color: moodColor }}>
                    {e.moodWord ?? '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}

    </div>
  )
}
