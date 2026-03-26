import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { Trash2, Zap, Plus } from 'lucide-react'
import { useFood, addMeal, removeMeal, saveFoodNotes } from '../hooks/useFood'
import { awardXP } from '../hooks/useXP'
import { XP as XP_VALUES, USER } from '../theme'
import { db } from '../db'
import SectionLabel from '../components/SectionLabel'

// ─── Quick-add presets (Freddie's cut diet) ───────────────────────────────────

const QUICK_MEALS = [
  { name: 'Protein Shake',   cal: 130, protein: 25 },
  { name: 'Eggs ×3',         cal: 225, protein: 19 },
  { name: 'Greek Yoghurt',   cal: 170, protein: 17 },
  { name: 'Chicken 150g',    cal: 248, protein: 46 },
  { name: 'Tuna Can',        cal: 160, protein: 35 },
  { name: 'Salmon 150g',     cal: 312, protein: 31 },
  { name: 'Beef Mince 150g', cal: 325, protein: 38 },
  { name: 'Cottage Cheese',  cal: 200, protein: 28 },
  { name: 'Rice 150g',       cal: 195, protein: 4  },
  { name: 'Oats 80g',        cal: 296, protein: 10 },
  { name: 'Banana',          cal: 105, protein: 1  },
  { name: 'Almonds 30g',     cal: 174, protein: 6  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function barColor(pct) {
  return pct >= 0.85 ? '#4ade80' : pct >= 0.4 ? '#d4a853' : '#525252'
}

function Bar({ value, max }) {
  const pct   = Math.min(value / max, 1)
  const color = barColor(pct)
  return (
    <div className="h-[3px] bg-realm-track w-full mt-1.5">
      <div
        className="h-full transition-all duration-500"
        style={{
          width: `${pct * 100}%`,
          background: color,
          boxShadow: pct >= 0.85 ? `0 0 6px ${color}80` : 'none',
        }}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Food({ onXP }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const food     = useFood()

  const meals     = food?.meals       ?? []
  const totalCal  = food?.totalCal    ?? 0
  const totalProt = food?.totalProtein ?? 0

  // add form state
  const [name,    setName]    = useState('')
  const [cal,     setCal]     = useState('')
  const [protein, setProtein] = useState('')
  const [notes,   setNotes]   = useState(food?.notes ?? '')
  const [saving,  setSaving]  = useState(false)

  const alreadyXPd = useRef(false)
  // mark XP awarded if food record already exists
  if (food !== undefined && food !== null && !alreadyXPd.current && meals.length > 0) {
    alreadyXPd.current = true
  }

  const calPct  = Math.min(totalCal  / USER.cutCals,    1)
  const protPct = Math.min(totalProt / USER.cutProtein, 1)

  const calLeft  = Math.max(0, USER.cutCals    - totalCal)
  const protLeft = Math.max(0, USER.cutProtein - totalProt)

  async function handleAddMeal(presetOrNull) {
    const mealName    = presetOrNull?.name    ?? name.trim()
    const mealCal     = presetOrNull?.cal     ?? (parseInt(cal, 10) || 0)
    const mealProtein = presetOrNull?.protein ?? (parseInt(protein, 10) || 0)
    if (!mealName) return

    setSaving(true)
    const meal = {
      id: crypto.randomUUID(),
      name: mealName,
      cal: mealCal,
      protein: mealProtein,
      time: format(new Date(), 'HH:mm'),
    }
    await addMeal(todayStr, meal)

    if (!alreadyXPd.current) {
      alreadyXPd.current = true
      const [totalWeightLogs, totalScans, totalFinanceLogs] = await Promise.all([
        db.entries.filter(e => !!e.weight).count(),
        db.scans.count(),
        db.finance.count(),
      ])
      const { unlockedAchievements } = await awardXP(XP_VALUES.logFood, {
        totalCheckIns: 0, checkInStreak: 0, totalWorkouts: 0,
        totalGoals: 0, completedGoals: 0, outboundDays: 0, totalCalls: 0,
        totalWeightLogs, totalScans, totalFinanceLogs,
      })
      onXP?.({ amount: XP_VALUES.logFood, achievement: unlockedAchievements[0] ?? null })
    }

    if (!presetOrNull) {
      setName('')
      setCal('')
      setProtein('')
    }
    setSaving(false)
  }

  async function handleRemove(id) {
    await removeMeal(todayStr, id)
  }

  async function handleNotesBlur() {
    await saveFoodNotes(todayStr, notes.trim() || null)
  }

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">

      {/* header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="ios-title">
            FUEL LOG
          </h1>
          <p className="text-[11px] text-realm-faint mt-1">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        {!alreadyXPd.current && (
          <div className="flex items-center gap-1 px-2.5 py-1.5
            bg-realm-gold/10 border border-realm-gold/25">
            <Zap size={11} className="text-realm-gold" />
            <span className="ff-mono text-[11px] text-realm-gold">+{XP_VALUES.logFood} XP</span>
          </div>
        )}
      </div>

      {/* ── RUNNING TOTALS ── */}
      <div className="mb-5 ios-card">
        <div className="grid grid-cols-2 gap-4">
          {/* calories */}
          <div>
            <div className="flex justify-between items-baseline mb-0.5">
              <span className="ios-label">Calories</span>
              <span className="ff-mono text-[10px]"
                style={{ color: barColor(calPct) }}>
                {calLeft > 0 ? `${calLeft} left` : 'OVER'}
              </span>
            </div>
            <span
              className="ff-mono text-[22px] tabular-nums font-medium"
              style={{ color: barColor(calPct) }}
            >
              {totalCal}
            </span>
            <span className="ff-mono text-[11px] text-realm-muted"> / {USER.cutCals}</span>
            <Bar value={totalCal} max={USER.cutCals} />
          </div>

          {/* protein */}
          <div>
            <div className="flex justify-between items-baseline mb-0.5">
              <span className="ios-label">Protein</span>
              <span className="ff-mono text-[10px]"
                style={{ color: barColor(protPct) }}>
                {protLeft > 0 ? `${protLeft}g left` : 'DONE'}
              </span>
            </div>
            <span
              className="ff-mono text-[22px] tabular-nums font-medium"
              style={{ color: barColor(protPct) }}
            >
              {totalProt}g
            </span>
            <span className="ff-mono text-[11px] text-realm-muted"> / {USER.cutProtein}g</span>
            <Bar value={totalProt} max={USER.cutProtein} />
          </div>
        </div>

        {/* P/cal ratio */}
        {totalCal > 0 && (
          <div className="mt-3 pt-3 border-t border-realm-hairline flex gap-4">
            <div>
              <span className="ff-mono text-[9px] text-realm-faint uppercase tracking-wider block">
                P/Cal ratio
              </span>
              <span className="ff-mono text-[13px]"
                style={{ color: (totalProt / totalCal) * 100 >= 35 ? '#4ade80' : '#d4a853' }}>
                {((totalProt / totalCal) * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="ff-mono text-[9px] text-realm-faint uppercase tracking-wider block">
                Meals
              </span>
              <span className="ff-mono text-[13px] text-realm-text">{meals.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD MEAL ── */}
      <div className="mb-4">
        <SectionLabel>Add Meal</SectionLabel>
        <div className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Meal name…"
            className="fl-input ff-mono text-[13px]"
            onKeyDown={e => e.key === 'Enter' && handleAddMeal(null)}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="ios-label block mb-1">
                Calories
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={cal}
                onChange={e => setCal(e.target.value)}
                placeholder="—"
                className="fl-input ff-mono text-sm text-center py-2"
              />
            </div>
            <div className="flex-1">
              <label className="ios-label block mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={protein}
                onChange={e => setProtein(e.target.value)}
                placeholder="—"
                className="fl-input ff-mono text-sm text-center py-2"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                disabled={saving || !name.trim()}
                onClick={() => handleAddMeal(null)}
                className="py-2 px-4 ff-mono text-[11px] uppercase tracking-widest border
                  transition-all duration-150 disabled:opacity-30 h-[38px]"
                style={{
                  borderColor: '#d4a853',
                  color: '#d4a853',
                  backgroundColor: '#d4a85316',
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK ADD ── */}
      <div className="mb-5">
        <SectionLabel>Quick Add</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_MEALS.map(m => (
            <button
              key={m.name}
              type="button"
              onClick={() => handleAddMeal(m)}
              className="flex items-center justify-between px-3 py-2
                ios-card hover:border-realm-gold/45
                transition-all duration-150 text-left border"
            >
              <span className="ff-mono text-[11px] text-realm-soft truncate pr-1">{m.name}</span>
              <div className="flex flex-col items-end shrink-0">
                <span className="ff-mono text-[10px] text-realm-muted tabular-nums">{m.cal}c</span>
                <span className="ff-mono text-[10px] text-realm-gold tabular-nums">{m.protein}p</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── TODAY'S MEALS ── */}
      {meals.length > 0 && (
        <div className="mb-5">
          <SectionLabel>Today's Log</SectionLabel>
          <div className="ios-group">
            {[...meals].reverse().map(m => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="ff-mono text-[10px] text-[#2a2a2a] w-10 shrink-0 tabular-nums">
                  {m.time}
                </span>
                <span className="ff-mono text-[12px] text-realm-text flex-1 truncate">
                  {m.name}
                </span>
                <span className="ff-mono text-[11px] text-realm-muted tabular-nums shrink-0">
                  {m.cal}c
                </span>
                <span className="ff-mono text-[11px] text-realm-gold tabular-nums shrink-0 w-10">
                  {m.protein}p
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(m.id)}
                  className="text-[#1e1e1e] hover:text-[#f87171] transition-colors shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NOTES ── */}
      <div className="mb-6">
        <SectionLabel>Notes</SectionLabel>
        <textarea
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Anything worth noting about today's food…"
          className="fl-input ff-mono text-[13px] resize-none"
          style={{ padding: '0.6rem 0.75rem' }}
        />
      </div>

    </div>
  )
}
