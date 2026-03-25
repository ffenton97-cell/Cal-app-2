import { useState, useMemo, useEffect } from 'react'
import { useHash } from '../hooks/useHash'
import { format } from 'date-fns'
import { Plus, Trash2, RotateCcw, Zap, Target } from 'lucide-react'
import { useTodos, saveTodo, toggleTodo, deleteTodo, saveMissedAccountability } from '../hooks/useTodos'
import { awardXP } from '../hooks/useXP'
import { XP as XP_VALUES } from '../theme'
import { rankOpenTodosForWeek, applyWeeklyPrioritySuggestions } from '../lib/todoWeekPrioritize.js'
import SectionLabel from '../components/SectionLabel'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES = [
  { id: 'HIGH', color: '#e05070' },
  { id: 'MED',  color: '#d4a050' },
  { id: 'LOW',  color: 'rgba(255,255,255,0.22)' },
]
const CATEGORIES = ['SALES', 'WORK', 'BODY', 'FINANCE', 'PERSONAL', 'OTHER']
const TABS = ['FOCUS', 'TODAY', 'UPCOMING', 'ALL', 'DONE']
const BLANK = { title: '', category: 'WORK', priority: 'MED', due: '', recur: false, recurDays: 7, notes: '' }

const priColor = id => PRIORITIES.find(p => p.id === id)?.color ?? '#525252'
const today    = () => format(new Date(), 'yyyy-MM-dd')

function filterTodos(todos, tab) {
  const t = today()
  switch (tab) {
    case 'FOCUS':    return todos.filter((x) => !x.done)
    case 'TODAY':    return todos.filter(x => !x.done && x.due && x.due <= t)
    case 'UPCOMING': return todos.filter(x => !x.done && (!x.due || x.due > t))
    case 'ALL':      return todos.filter(x => !x.done)
    case 'DONE':     return todos.filter(x => x.done)
    default:         return todos
  }
}

function sortTodos(todos) {
  const order = { HIGH: 0, MED: 1, LOW: 2 }
  return [...todos].sort((a, b) => {
    const pd = (order[a.priority] ?? 1) - (order[b.priority] ?? 1)
    if (pd !== 0) return pd
    if (a.due && b.due) return a.due.localeCompare(b.due)
    if (a.due) return -1
    if (b.due) return 1
    return 0
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TodoItem({ todo, onToggle, onDelete, rank, weeklyHints, showAccountability }) {
  const t         = today()
  const overdue   = !todo.done && todo.due && todo.due < t
  const dueToday  = !todo.done && todo.due === t
  const color     = priColor(todo.priority)
  const [whyOpen, setWhyOpen] = useState(false)
  const [draftWhy, setDraftWhy] = useState(todo.missedWhy || '')

  useEffect(() => {
    setDraftWhy(todo.missedWhy || '')
  }, [todo.id, todo.missedWhy])

  return (
    <div
      className="border-b border-realm-hairline last:border-0 transition-colors"
      style={{ backgroundColor: todo.done ? '#0f0f0f' : undefined }}
    >
      <div className="flex items-start gap-3 px-3 py-2.5">
        {rank != null && (
          <span className="ff-mono text-[10px] text-realm-gold tabular-nums w-5 shrink-0 mt-0.5">
            {rank}
          </span>
        )}
        {/* complete toggle */}
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 w-4 h-4 shrink-0 border transition-all duration-150 flex items-center
            justify-center"
          style={{
            borderColor:     todo.done ? '#4ade8060' : color,
            backgroundColor: todo.done ? '#4ade8018' : 'transparent',
          }}
        >
          {todo.done && <span className="text-[#4ade80] text-[9px]">✓</span>}
        </button>

        {/* content */}
        <div className="flex-1 min-w-0">
          <p
            className="ff-mono text-[13px] leading-snug"
            style={{
              color:          todo.done ? '#3a3a3a' : '#e5e5e5',
              textDecoration: todo.done ? 'line-through' : 'none',
            }}
          >
            {todo.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {todo.category && (
              <span className="ff-mono text-[9px] text-realm-faint uppercase tracking-wider">
                {todo.category}
              </span>
            )}
            {todo.due && (
              <span
                className="ff-mono text-[9px] uppercase tracking-wider"
                style={{ color: overdue ? '#f87171' : dueToday ? '#fbbf24' : '#3a3a3a' }}
              >
                {overdue ? `OVERDUE ${todo.due}` : dueToday ? 'TODAY' : todo.due}
              </span>
            )}
            {todo.recur && (
              <span className="ff-mono text-[9px] text-[#22d3ee]">↻ every {todo.recurDays}d</span>
            )}
          </div>
          {weeklyHints && (
            <p className="ff-mono text-[9px] text-realm-muted mt-1 tracking-wide">
              {weeklyHints}
            </p>
          )}
        </div>

        {/* priority dot + delete */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
          <button
            type="button"
            onClick={onDelete}
            className="text-[#1e1e1e] hover:text-[#f87171] transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {showAccountability && overdue && !todo.done && (
        <div className="px-3 pb-3 pt-2 ml-10 sm:ml-12 border-t border-realm-hairline bg-realm-bg-mid">
          <p className="ff-mono text-[9px] text-[#f87171] uppercase tracking-[0.15em] mb-1.5">
            Why didn&apos;t you get this done?
          </p>
          {todo.missedWhy && !whyOpen ? (
            <div className="flex items-start justify-between gap-2">
              <p className="ff-mono text-[11px] text-[#a3a3a3] leading-relaxed flex-1">
                {todo.missedWhy}
              </p>
              <button
                type="button"
                onClick={() => setWhyOpen(true)}
                className="ff-mono text-[9px] text-realm-muted uppercase shrink-0"
              >
                Edit
              </button>
            </div>
          ) : (
            <>
              <textarea
                rows={2}
                value={draftWhy}
                onChange={(e) => setDraftWhy(e.target.value)}
                placeholder="Be honest — one or two lines. No one else sees this unless you sync."
                className="fl-input ff-mono text-[12px] resize-none w-full mb-2"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await saveMissedAccountability(todo.id, draftWhy)
                    setWhyOpen(false)
                  }}
                  className="px-3 py-1.5 ff-mono text-[10px] uppercase border border-realm-gold/45 text-realm-gold"
                >
                  Save
                </button>
                {todo.missedWhy && (
                  <button
                    type="button"
                    onClick={() => setWhyOpen(false)}
                    className="px-3 py-1.5 ff-mono text-[10px] uppercase text-realm-muted"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Todos({ onXP }) {
  const hash = useHash()
  const todos     = useTodos()
  const [tab,     setTab]     = useState(() => {
    if (typeof window === 'undefined') return 'TODAY'
    const h = window.location.hash.replace(/^#/, '')
    return h === 'week-focus' || h === 'focus' ? 'FOCUS' : 'TODAY'
  })
  const [showForm, setShowForm] = useState(false)
  const [form,    setForm]    = useState(BLANK)
  const [saving,  setSaving]  = useState(false)
  const [applyingFocus, setApplyingFocus] = useState(false)

  useEffect(() => {
    if (hash === 'week-focus' || hash === 'focus') setTab('FOCUS')
  }, [hash])

  const focusBundle = useMemo(
    () => rankOpenTodosForWeek(todos.filter((x) => !x.done)),
    [todos]
  )

  const visibleRows =
    tab === 'FOCUS'
      ? focusBundle.ranked
      : sortTodos(filterTodos(todos, tab)).map((t) => ({ todo: t, score: null, hints: [] }))

  const todayCount    = filterTodos(todos, 'TODAY').length
  const upcomingCount = filterTodos(todos, 'UPCOMING').length
  const focusCount    = focusBundle.ranked.length

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleComplete(id) {
    await toggleTodo(id)
    // award XP
    const { unlockedAchievements } = await awardXP(XP_VALUES.completeTodo, {
      totalCheckIns: 0, checkInStreak: 0, totalWorkouts: 0,
      totalGoals: 0, completedGoals: 0, outboundDays: 0, totalCalls: 0,
      totalWeightLogs: 0, totalScans: 0, totalFinanceLogs: 0,
    })
    onXP?.({ amount: XP_VALUES.completeTodo, achievement: unlockedAchievements[0] ?? null })
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    await saveTodo({
      id:          crypto.randomUUID(),
      title:       form.title.trim(),
      category:    form.category,
      priority:    form.priority,
      due:         form.due || null,
      originalDue: form.due || null,
      recur:       form.recur,
      recurDays:   form.recur ? parseInt(form.recurDays, 10) || 7 : 0,
      done:        false,
      completedDate: null,
      created:     new Date().toISOString(),
      notes:       form.notes.trim() || null,
    })
    setSaving(false)
    setForm(BLANK)
    setShowForm(false)
    setTab('ALL')
  }

  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">

      {/* header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="ff-heading text-[22px] font-bold text-realm-text tracking-tight leading-none">
            Task queue
          </h1>
          <p className="ff-mono text-[11px] text-realm-faint mt-1 tracking-[0.15em] uppercase">
            {format(new Date(), 'EEEE, d MMMM')}
          </p>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1.5
          bg-realm-gold/10 border border-realm-gold/25">
          <Zap size={11} className="text-realm-gold" />
          <span className="ff-mono text-[11px] text-realm-gold">+{XP_VALUES.completeTodo} per task</span>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => {
          const count =
            t === 'TODAY' ? todayCount : t === 'UPCOMING' ? upcomingCount : t === 'FOCUS' ? focusCount : null
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex-shrink-0 px-3 py-1.5 ff-mono text-[11px] uppercase tracking-widest
                border transition-all duration-150"
              style={{
                borderColor:     tab === t ? '#d4a853' : '#252525',
                color:           tab === t ? '#d4a853' : '#3a3a3a',
                backgroundColor: tab === t ? '#d4a85314' : '#161616',
              }}
            >
              {t}{count != null && count > 0 ? ` ${count}` : ''}
            </button>
          )
        })}
      </div>

      {tab === 'FOCUS' && (
        <div className="mb-3 border border-realm-border bg-realm-bg-mid px-3 py-3">
          <div className="flex items-start gap-2">
            <Target size={14} className="text-realm-gold shrink-0 mt-0.5" />
            <div>
              <p className="ff-mono text-[10px] text-realm-gold uppercase tracking-widest">
                This week&apos;s order
              </p>
              <p className="ff-mono text-[10px] text-realm-muted mt-1 leading-relaxed">
                Ranked for this ISO week: overdue first, then due before Sunday, then sales and dial-heavy
                titles. Your manual priority still feeds the score.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={applyingFocus || focusBundle.ranked.length === 0}
            onClick={async () => {
              setApplyingFocus(true)
              try {
                await applyWeeklyPrioritySuggestions(focusBundle.ranked)
              } finally {
                setApplyingFocus(false)
              }
            }}
            className="mt-3 w-full py-2.5 ff-mono text-[10px] uppercase tracking-wider border border-realm-gold/35 text-realm-gold disabled:opacity-30"
          >
            {applyingFocus
              ? '…'
              : 'Apply rank → HIGH/MED/LOW (top 3 / next 5 / rest)'}
          </button>
        </div>
      )}

      {/* task list */}
      {visibleRows.length > 0 ? (
        <div className="border border-realm-border bg-realm-panel mb-4">
          {visibleRows.map((row, i) => (
            <TodoItem
              key={row.todo.id}
              todo={row.todo}
              onToggle={() => handleComplete(row.todo.id)}
              onDelete={() => deleteTodo(row.todo.id)}
              rank={tab === 'FOCUS' ? i + 1 : undefined}
              weeklyHints={
                tab === 'FOCUS' && row.score != null
                  ? `Score ${row.score} — ${row.hints.join(' · ')}`
                  : undefined
              }
              showAccountability={tab !== 'DONE'}
            />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center mb-4">
          <p className="ff-mono text-[11px] text-[#252525] uppercase tracking-widest">
            {tab === 'FOCUS'
              ? 'No open tasks'
              : tab === 'TODAY'
                ? 'Nothing due today'
                : tab === 'DONE'
                  ? 'No completed tasks'
                  : 'No tasks'}
          </p>
        </div>
      )}

      {/* add form */}
      {showForm && (
        <div className="mb-4">
          <SectionLabel>New Task</SectionLabel>
          <div className="border border-realm-gold/25 bg-realm-panel p-4 space-y-3">
            <input
              type="text"
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="Task description…"
              className="fl-input ff-mono text-[13px]"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />

            {/* priority */}
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button key={p.id} type="button"
                  onClick={() => setField('priority', p.id)}
                  className="px-2.5 py-1 ff-mono text-[10px] uppercase tracking-widest border
                    transition-all duration-150"
                  style={{
                    borderColor:     form.priority === p.id ? p.color : '#252525',
                    color:           form.priority === p.id ? p.color : '#3a3a3a',
                    backgroundColor: form.priority === p.id ? `${p.color}14` : 'transparent',
                  }}
                >
                  {p.id}
                </button>
              ))}
              <div className="ml-auto">
                <input
                  type="date"
                  value={form.due}
                  onChange={e => setField('due', e.target.value)}
                  className="fl-input ff-mono text-[11px] py-1 px-2"
                  style={{ colorScheme: 'dark', width: '140px' }}
                />
              </div>
            </div>

            {/* category */}
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map(c => (
                <button key={c} type="button"
                  onClick={() => setField('category', c)}
                  className="px-2 py-0.5 ff-mono text-[9px] uppercase tracking-widest border
                    transition-all duration-150"
                  style={{
                    borderColor:     form.category === c ? '#d4a853' : '#252525',
                    color:           form.category === c ? '#d4a853' : '#3a3a3a',
                    backgroundColor: form.category === c ? '#d4a85314' : 'transparent',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* recur */}
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => setField('recur', !form.recur)}
                className="flex items-center gap-2"
              >
                <RotateCcw size={12} className={form.recur ? 'text-[#22d3ee]' : 'text-realm-faint'} />
                <span className="ff-mono text-[10px] uppercase tracking-widest"
                  style={{ color: form.recur ? '#22d3ee' : '#3a3a3a' }}>
                  Recurring
                </span>
              </button>
              {form.recur && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="ff-mono text-[10px] text-realm-muted">every</span>
                  <input
                    type="number"
                    value={form.recurDays}
                    onChange={e => setField('recurDays', e.target.value)}
                    className="fl-input ff-mono text-sm text-center py-0.5 w-12"
                  />
                  <span className="ff-mono text-[10px] text-realm-muted">days</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button type="button" disabled={saving || !form.title.trim()} onClick={handleSave}
                className="flex-1 py-2.5 ff-mono text-[12px] uppercase tracking-[0.15em]
                  border border-realm-gold text-realm-gold bg-realm-gold/15 disabled:opacity-30">
                {saving ? '…' : 'Add Task'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2.5 ff-mono text-[12px] border border-realm-border text-realm-muted">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <button type="button" onClick={() => setShowForm(true)}
          className="w-full py-3 ff-mono text-[12px] uppercase tracking-[0.2em]
            border border-dashed border-realm-border text-realm-faint
            hover:border-realm-gold/45 hover:text-realm-muted
            transition-all duration-150 flex items-center justify-center gap-1.5">
          <Plus size={13} />
          New Task
        </button>
      )}

    </div>
  )
}
