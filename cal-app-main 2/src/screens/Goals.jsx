import { useState, useRef } from 'react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { Plus, Trash2, CheckCheck, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { useGoals, saveGoal, logGoalProgress, deleteGoal } from '../hooks/useGoals'
import { awardXP } from '../hooks/useXP'
import { XP as XP_VALUES } from '../theme'
import { db } from '../db'
import SectionLabel from '../components/SectionLabel'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'BODY',  color: '#4ade80' },
  { id: 'MONEY', color: '#d4a853' },
  { id: 'SALES', color: '#60a5fa' },
  { id: 'PERF',  color: '#fbbf24' },
  { id: 'HABIT', color: '#22d3ee' },
  { id: 'OTHER', color: '#8a8a8a' },
]

const catColor = id => CATEGORIES.find(c => c.id === id)?.color ?? '#8a8a8a'

const BLANK_FORM = { title: '', category: 'BODY', start: '', target: '', unit: '', deadline: '', why: '' }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function goalPct(goal) {
  const current = goal.current ?? goal.start ?? 0
  const inverted = goal.target < goal.start
  if (inverted) {
    const range = goal.start - goal.target
    return range ? Math.min(Math.max(0, (goal.start - current) / range), 1) : 0
  }
  const range = goal.target - (goal.start ?? 0)
  return range ? Math.min(Math.max(0, (current - (goal.start ?? 0)) / range), 1) : 0
}

function daysLeft(deadline) {
  if (!deadline) return null
  try {
    const diff = differenceInDays(parseISO(deadline), new Date())
    if (diff < 0)   return { label: 'OVERDUE', color: '#f87171' }
    if (diff === 0) return { label: 'DUE TODAY', color: '#fbbf24' }
    if (diff <= 7)  return { label: `${diff}d left`, color: '#fbbf24' }
    return { label: `${diff}d left`, color: '#525252' }
  } catch {
    return null
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// ─── Goal card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onXP }) {
  const [expanded,  setExpanded]  = useState(false)
  const [logVal,    setLogVal]    = useState('')
  const [saving,    setSaving]    = useState(false)
  const [completed, setCompleted] = useState(false)

  const pct      = goalPct(goal)
  const deadline = daysLeft(goal.deadline)
  const color    = catColor(goal.category)
  const current  = goal.current ?? goal.start ?? 0
  const inverted = goal.target < goal.start

  async function handleLog() {
    const val = parseFloat(logVal)
    if (isNaN(val)) return
    setSaving(true)
    await logGoalProgress(goal.id, val)

    // Check if newly completed
    const done = inverted ? val <= goal.target : val >= goal.target
    if (done && !goal.completed) {
      setCompleted(true)
      const [totalGoals, completedGoals, totalCheckIns, totalWorkouts, outboundDays,
             totalCalls, totalWeightLogs, totalScans, totalFinanceLogs] =
        await Promise.all([
          db.goals.count(),
          db.goals.filter(g => g.completed).count(),
          db.entries.count(),
          db.workouts.count(),
          db.outbound.count(),
          db.outbound.toArray().then(r => r.reduce((s, x) => s + (x.calls || 0), 0)),
          db.entries.filter(e => !!e.weight).count(),
          db.scans.count(),
          db.finance.count(),
        ])
      // Award goal_complete achievement XP
      const { unlockedAchievements } = await awardXP(0, {
        totalGoals, completedGoals,
        totalCheckIns, checkInStreak: 0,
        totalWorkouts, outboundDays, totalCalls,
        totalWeightLogs, totalScans, totalFinanceLogs,
      })
      if (unlockedAchievements.length) {
        onXP?.({ amount: 0, achievement: unlockedAchievements[0] })
      }
    }

    setLogVal('')
    setSaving(false)
    setExpanded(false)
  }

  async function handleDelete() {
    await deleteGoal(goal.id)
  }

  return (
    <div
      className="border rounded-xl overflow-hidden transition-all duration-200"
      style={{
        borderColor: goal.completed ? '#4ade8030' : '#252525',
        backgroundColor: goal.completed ? '#4ade8006' : '#161616',
      }}
    >
      {/* card header — tap to expand */}
      <button
        type="button"
        className="w-full px-3 pt-3 pb-2 text-left"
        onClick={() => !goal.completed && setExpanded(v => !v)}
      >
        {/* top row */}
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span
              className="ff-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5"
              style={{ background: `${color}18`, color }}
            >
              {goal.category}
            </span>
            {goal.completed && (
              <span className="ff-mono text-[9px] text-[#4ade80] uppercase tracking-widest">
                ✓ COMPLETE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {deadline && !goal.completed && (
              <span className="ff-mono text-[9px]" style={{ color: deadline.color }}>
                {deadline.label}
              </span>
            )}
            {!goal.completed && (
              expanded ? <ChevronUp size={12} className="text-realm-muted" />
                       : <ChevronDown size={12} className="text-realm-muted" />
            )}
          </div>
        </div>

        {/* title */}
        <p className="ff-mono text-[13px] text-realm-text mb-2">{goal.title}</p>

        {/* progress bar */}
        <div className="h-[3px] bg-realm-track w-full mb-1.5">
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${pct * 100}%`,
              background: goal.completed ? '#4ade80' : color,
              boxShadow: pct >= 0.8 ? `0 0 5px ${color}80` : 'none',
            }}
          />
        </div>

        {/* value row */}
        <div className="flex items-center justify-between">
          <span className="ff-mono text-[11px] tabular-nums"
            style={{ color: goal.completed ? '#4ade80' : color }}>
            {current} {goal.unit}
          </span>
          <span className="ff-mono text-[11px] text-realm-muted tabular-nums">
            {Math.round(pct * 100)}% → {goal.target} {goal.unit}
          </span>
        </div>

        {/* why */}
        {goal.why && !expanded && (
          <p className="ff-mono text-[10px] text-realm-faint mt-1 italic truncate">
            "{goal.why}"
          </p>
        )}
      </button>

      {/* expanded: log progress */}
      {expanded && !goal.completed && (
        <div className="px-3 pb-3 border-t border-realm-hairline pt-2.5 space-y-2">
          {goal.why && (
            <p className="ff-mono text-[10px] text-realm-faint italic">"{goal.why}"</p>
          )}
          <div className="flex items-center gap-2">
            <label className="ios-label">
              Current
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={logVal}
              onChange={e => setLogVal(e.target.value)}
              placeholder={String(current)}
              className="fl-input ff-mono text-sm text-center py-1.5 w-24"
            />
            <span className="ff-mono text-[11px] text-realm-muted">{goal.unit}</span>
            <button
              type="button"
              disabled={saving || !logVal}
              onClick={handleLog}
              className="ml-auto px-3 py-1.5 ff-mono text-[11px] uppercase tracking-widest
                border transition-all duration-150 disabled:opacity-30"
              style={{
                borderColor: '#d4a853',
                color: '#d4a853',
                backgroundColor: '#d4a85312',
              }}
            >
              {saving ? '…' : 'Log'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 text-[#2a2a2a] hover:text-[#f87171] transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}

      {/* completed: delete only */}
      {goal.completed && (
        <div className="px-3 pb-2 flex justify-end">
          <button
            type="button"
            onClick={handleDelete}
            className="ff-mono text-[9px] text-[#2a2a2a] hover:text-[#f87171]
              transition-colors uppercase tracking-widest"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

// ─── New goal form ─────────────────────────────────────────────────────────────

function NewGoalForm({ onSave, onCancel }) {
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    const id = crypto.randomUUID()
    const startNum  = parseFloat(form.start)  || 0
    const targetNum = parseFloat(form.target) || 0
    await saveGoal({
      id,
      title:     form.title.trim(),
      category:  form.category,
      start:     startNum,
      current:   startNum,
      target:    targetNum,
      unit:      form.unit.trim() || '',
      deadline:  form.deadline || null,
      why:       form.why.trim() || null,
      completed: false,
      history:   [],
    })
    setSaving(false)
    onSave?.()
  }

  return (
    <div className="ios-card space-y-3 border border-realm-gold/25">
      {/* title */}
      <div>
        <label className="ios-label block mb-1">
          Goal
        </label>
        <input
          type="text"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="What are you working toward?"
          className="fl-input ff-mono text-[13px]"
        />
      </div>

      {/* category */}
      <div>
        <label className="ios-label block mb-1">
          Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => set('category', c.id)}
              className="px-2.5 py-1 ff-mono text-[10px] uppercase tracking-widest border
                transition-all duration-150"
              style={{
                borderColor:     form.category === c.id ? c.color : '#252525',
                color:           form.category === c.id ? c.color : '#3a3a3a',
                backgroundColor: form.category === c.id ? `${c.color}14` : 'transparent',
              }}
            >
              {c.id}
            </button>
          ))}
        </div>
      </div>

      {/* start / target / unit */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="ios-label block mb-1">
            Start
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={form.start}
            onChange={e => set('start', e.target.value)}
            placeholder="0"
            className="fl-input ff-mono text-sm text-center py-2"
          />
        </div>
        <div>
          <label className="ios-label block mb-1">
            Target
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={form.target}
            onChange={e => set('target', e.target.value)}
            placeholder="100"
            className="fl-input ff-mono text-sm text-center py-2"
          />
        </div>
        <div>
          <label className="ios-label block mb-1">
            Unit
          </label>
          <input
            type="text"
            value={form.unit}
            onChange={e => set('unit', e.target.value)}
            placeholder="kg"
            className="fl-input ff-mono text-sm text-center py-2"
          />
        </div>
      </div>

      {/* deadline */}
      <div>
        <label className="ios-label block mb-1">
          Deadline
        </label>
        <input
          type="date"
          value={form.deadline}
          onChange={e => set('deadline', e.target.value)}
          className="fl-input ff-mono text-sm py-2"
          style={{ colorScheme: 'dark' }}
        />
      </div>

      {/* why */}
      <div>
        <label className="ios-label block mb-1">
          Why
        </label>
        <input
          type="text"
          value={form.why}
          onChange={e => set('why', e.target.value)}
          placeholder="Your motivation…"
          className="fl-input ff-mono text-[13px]"
        />
      </div>

      {/* actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={saving || !form.title.trim()}
          onClick={handleSave}
          className="flex-1 py-3 ff-mono text-[12px] uppercase tracking-[0.15em]
            border border-realm-gold text-realm-gold bg-realm-gold/15
            disabled:opacity-30 transition-all active:scale-[0.99]"
        >
          {saving ? 'Saving…' : 'Add Goal'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3 ff-mono text-[12px] uppercase tracking-[0.15em]
            border border-realm-border text-realm-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Goals({ onXP }) {
  const goals    = useGoals()
  const [showForm, setShowForm] = useState(false)
  const awarded  = useRef(false)

  const active    = goals.filter(g => !g.completed).sort((a, b) => {
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return a.deadline < b.deadline ? -1 : 1
  })
  const completed = goals.filter(g => g.completed)

  async function handleAddGoal() {
    setShowForm(false)
    if (!awarded.current) {
      awarded.current = true
      const totalGoals = await db.goals.count()
      const { unlockedAchievements } = await awardXP(XP_VALUES.addGoal, {
        totalGoals, completedGoals: 0,
        totalCheckIns: 0, checkInStreak: 0, totalWorkouts: 0,
        outboundDays: 0, totalCalls: 0, totalWeightLogs: 0,
        totalScans: 0, totalFinanceLogs: 0,
      })
      onXP?.({ amount: XP_VALUES.addGoal, achievement: unlockedAchievements[0] ?? null })
    } else {
      onXP?.({ amount: XP_VALUES.addGoal })
    }
  }

  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">

      {/* header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="ios-title">
            Banners
          </h1>
          <p className="text-[11px] text-realm-faint mt-1">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1.5
          bg-realm-gold/10 border border-realm-gold/25">
          <Zap size={11} className="text-realm-gold" />
          <span className="ff-mono text-[11px] text-realm-gold">+{XP_VALUES.addGoal} per goal</span>
        </div>
      </div>

      {/* summary chips */}
      {goals.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-realm-panel border border-realm-hairline">
            <span className="ff-mono text-[12px] text-realm-text tabular-nums">{active.length}</span>
            <span className="ff-mono text-[10px] text-realm-muted">active</span>
          </div>
          {completed.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5
              bg-[#4ade8010] border border-[#4ade8028]">
              <CheckCheck size={11} className="text-[#4ade80]" />
              <span className="ff-mono text-[12px] text-[#4ade80] tabular-nums">{completed.length}</span>
              <span className="ff-mono text-[10px] text-[#4ade80]">completed</span>
            </div>
          )}
        </div>
      )}

      {/* active goals */}
      {active.length > 0 && (
        <div className="mb-5">
          <SectionLabel>Active</SectionLabel>
          <div className="space-y-2">
            {active.map(g => (
              <GoalCard key={g.id} goal={g} onXP={onXP} />
            ))}
          </div>
        </div>
      )}

      {/* new goal form */}
      {showForm && (
        <div className="mb-5">
          <SectionLabel>New Objective</SectionLabel>
          <NewGoalForm onSave={handleAddGoal} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* add goal button */}
      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full py-3 ff-mono text-[12px] uppercase tracking-[0.2em]
            border border-dashed border-realm-border text-realm-faint
            hover:border-realm-gold/45 hover:text-realm-muted
            transition-all duration-150 flex items-center justify-center gap-1.5 mb-5"
        >
          <Plus size={13} />
          New Objective
        </button>
      )}

      {/* completed */}
      {completed.length > 0 && (
        <div className="mb-4">
          <SectionLabel>Completed</SectionLabel>
          <div className="space-y-2">
            {completed.map(g => (
              <GoalCard key={g.id} goal={g} onXP={onXP} />
            ))}
          </div>
        </div>
      )}

      {/* empty state */}
      {goals.length === 0 && !showForm && (
        <div className="py-12 text-center">
          <p className="ff-mono text-[11px] text-[#252525] uppercase tracking-widest">
            No objectives set
          </p>
          <p className="ff-mono text-[10px] text-[#1e1e1e] mt-1">
            Tap New Objective to get started
          </p>
        </div>
      )}

    </div>
  )
}
