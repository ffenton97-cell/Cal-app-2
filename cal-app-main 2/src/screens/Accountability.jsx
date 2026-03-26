'use client'

import { useState } from 'react'
import { format, subDays, addDays, isToday, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Dumbbell, Utensils, Phone, FileText, Target, ClipboardList } from 'lucide-react'
import { useEntry } from '../hooks/useEntry'
import { useFood } from '../hooks/useFood'
import { useWorkout } from '../hooks/useWorkout'
import { useOutbound } from '../hooks/useOutbound'
import { useTodos } from '../hooks/useTodos'
import { useDayNote } from '../hooks/useDayNotes'
import { useGoals } from '../hooks/useGoals'

function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={13} className="text-realm-gold shrink-0" strokeWidth={2} />
      <span className="ios-label">{label}</span>
    </div>
  )
}

function StatPill({ label, value, highlight }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-white/[0.05] border border-white/[0.07] px-3 py-2 min-w-[60px]">
      <span className={`forge-mono text-[15px] font-semibold tabular-nums ${highlight ? 'text-realm-gold' : 'text-white/90'}`}>
        {value ?? '—'}
      </span>
      <span className="text-[10px] text-white/38 font-medium tracking-wide uppercase">{label}</span>
    </div>
  )
}

function EmptyState({ label }) {
  return (
    <p className="text-[13px] text-white/28 italic py-1">{label}</p>
  )
}

function CheckInSection({ dateStr }) {
  const entry = useEntry(dateStr)

  if (!entry) return (
    <div className="ios-card mb-3">
      <SectionHeader icon={ClipboardList} label="Check-In" />
      <EmptyState label="No check-in recorded" />
    </div>
  )

  const moodEmoji = { great: '😄', good: '🙂', okay: '😐', rough: '😟', bad: '😞' }
  const moodColor = { great: 'text-[#6edba0]', good: 'text-[#6edba0]', okay: 'text-realm-ember', rough: 'text-realm-gold', bad: 'text-realm-gold' }

  return (
    <div className="ios-card mb-3">
      <SectionHeader icon={ClipboardList} label="Check-In" />
      <div className="flex flex-wrap gap-2 mb-3">
        {entry.weight != null && <StatPill label="Weight" value={`${entry.weight}kg`} />}
        {entry.cals != null && <StatPill label="Calories" value={entry.cals} />}
        {entry.protein != null && <StatPill label="Protein" value={`${entry.protein}g`} />}
      </div>
      {entry.mood && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[18px]">{moodEmoji[entry.mood] ?? '•'}</span>
          <span className={`text-[14px] font-medium capitalize ${moodColor[entry.mood] ?? 'text-white/70'}`}>
            {entry.mood}
          </span>
          {entry.moodWord && (
            <span className="text-[13px] text-white/45">— {entry.moodWord}</span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        {[
          { key: 'gym', label: 'Gym' },
          { key: 'win', label: 'Win' },
          { key: 'sales', label: 'Sales' },
        ].map(({ key, label }) => (
          entry[key] != null && (
            <div key={key} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium border ${entry[key] ? 'bg-[#6edba0]/[0.10] border-[#6edba0]/[0.22] text-[#6edba0]' : 'bg-white/[0.04] border-white/[0.07] text-white/35'}`}>
              {entry[key] ? <CheckCircle2 size={11} strokeWidth={2.5} /> : <Circle size={11} strokeWidth={1.5} />}
              {label}
            </div>
          )
        ))}
      </div>
    </div>
  )
}

function FoodSection({ dateStr }) {
  const food = useFood(dateStr)

  if (!food || !food.meals?.length) return (
    <div className="ios-card mb-3">
      <SectionHeader icon={Utensils} label="Nutrition" />
      <EmptyState label="No meals logged" />
    </div>
  )

  return (
    <div className="ios-card mb-3">
      <SectionHeader icon={Utensils} label="Nutrition" />
      <div className="flex flex-wrap gap-2 mb-3">
        <StatPill label="Calories" value={food.totalCal || 0} highlight={food.totalCal >= 2000} />
        <StatPill label="Protein" value={`${food.totalProtein || 0}g`} highlight={(food.totalProtein || 0) >= 150} />
        <StatPill label="Meals" value={food.meals.length} />
      </div>
      <div className="ios-group overflow-hidden">
        {food.meals.map((meal, i) => (
          <div key={meal.id ?? i} className="ios-row flex items-center justify-between gap-3">
            <span className="text-[13px] text-white/80 flex-1 min-w-0 truncate">{meal.name || 'Meal'}</span>
            <div className="flex items-center gap-2 shrink-0">
              {meal.cal != null && (
                <span className="forge-mono text-[12px] text-white/45 tabular-nums">{meal.cal} kcal</span>
              )}
              {meal.protein != null && (
                <span className="forge-mono text-[12px] text-realm-gold/70 tabular-nums">{meal.protein}g</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {food.notes && (
        <p className="mt-2 text-[13px] text-white/45 italic">{food.notes}</p>
      )}
    </div>
  )
}

function WorkoutSection({ dateStr }) {
  const workout = useWorkout(dateStr)

  if (!workout || (!workout.type && !workout.exercises?.length)) return (
    <div className="ios-card mb-3">
      <SectionHeader icon={Dumbbell} label="Workout" />
      <EmptyState label="No workout logged" />
    </div>
  )

  return (
    <div className="ios-card mb-3">
      <SectionHeader icon={Dumbbell} label="Workout" />
      {workout.type && (
        <span className="inline-block mb-2 rounded-lg bg-realm-gold/[0.12] border border-realm-gold/[0.20] px-2.5 py-1 text-[12px] font-semibold text-realm-gold tracking-wide uppercase">
          {workout.type}
        </span>
      )}
      {workout.exercises?.length > 0 && (
        <div className="ios-group mt-1 overflow-hidden">
          {workout.exercises.map((ex, i) => (
            <div key={i} className="ios-row flex items-center justify-between gap-3">
              <span className="text-[13px] text-white/80 flex-1 min-w-0 truncate">{ex.name}</span>
              <span className="forge-mono text-[12px] text-white/40 tabular-nums shrink-0">
                {ex.sets ? `${ex.sets}×${ex.reps ?? '?'}` : ex.duration ? `${ex.duration}` : ''}
                {ex.weight ? ` @ ${ex.weight}kg` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
      {workout.notes && (
        <p className="mt-2 text-[13px] text-white/45 italic">{workout.notes}</p>
      )}
    </div>
  )
}

function OutboundSection({ dateStr }) {
  const outbound = useOutbound(dateStr)

  if (!outbound) return (
    <div className="ios-card mb-3">
      <SectionHeader icon={Phone} label="Outreach" />
      <EmptyState label="No outreach logged" />
    </div>
  )

  const stats = [
    { label: 'Calls', value: outbound.calls },
    { label: 'Connected', value: outbound.connected },
    { label: 'Convos', value: outbound.convos },
    { label: 'Emails', value: outbound.emails },
    { label: 'Meetings', value: outbound.meetings },
  ].filter(s => s.value != null && s.value !== 0)

  return (
    <div className="ios-card mb-3">
      <SectionHeader icon={Phone} label="Outreach" />
      {stats.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {stats.map(s => <StatPill key={s.label} label={s.label} value={s.value} />)}
        </div>
      ) : (
        <EmptyState label="No activity recorded" />
      )}
      {outbound.notes && (
        <p className="mt-2 text-[13px] text-white/45 italic">{outbound.notes}</p>
      )}
    </div>
  )
}

function TodosSection({ dateStr }) {
  const todos = useTodos()

  const completedToday = todos.filter(t => t.done && t.completedDate === dateStr)
  const dueToday = todos.filter(t => !t.done && t.due === dateStr)
  const overdue = todos.filter(t => !t.done && t.due && t.due < dateStr)

  if (!completedToday.length && !dueToday.length && !overdue.length) return (
    <div className="ios-card mb-3">
      <SectionHeader icon={CheckCircle2} label="Tasks" />
      <EmptyState label="No tasks for this day" />
    </div>
  )

  return (
    <div className="ios-card mb-3">
      <SectionHeader icon={CheckCircle2} label="Tasks" />
      <div className="flex flex-wrap gap-2 mb-3">
        {completedToday.length > 0 && <StatPill label="Done" value={completedToday.length} highlight />}
        {dueToday.length > 0 && <StatPill label="Due" value={dueToday.length} />}
        {overdue.length > 0 && <StatPill label="Overdue" value={overdue.length} />}
      </div>
      {completedToday.length > 0 && (
        <div className="ios-group overflow-hidden mb-2">
          {completedToday.map(t => (
            <div key={t.id} className="ios-row flex items-center gap-2.5">
              <CheckCircle2 size={13} strokeWidth={2} className="text-[#6edba0] shrink-0" />
              <span className="text-[13px] text-white/60 line-through flex-1 min-w-0 truncate">{t.text}</span>
            </div>
          ))}
        </div>
      )}
      {(dueToday.length > 0 || overdue.length > 0) && (
        <div className="ios-group overflow-hidden">
          {[...dueToday, ...overdue].map(t => (
            <div key={t.id} className="ios-row flex items-center gap-2.5">
              <Circle size={13} strokeWidth={1.5} className={t.due < dateStr ? 'text-realm-gold shrink-0' : 'text-white/30 shrink-0'} />
              <span className={`text-[13px] flex-1 min-w-0 truncate ${t.due < dateStr ? 'text-realm-gold/80' : 'text-white/70'}`}>
                {t.text}
              </span>
              {t.due < dateStr && (
                <span className="text-[11px] text-realm-gold/60 shrink-0">overdue</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NotesSection({ dateStr }) {
  const dayNote = useDayNote(dateStr)

  if (!dayNote?.notes?.length) return null

  return (
    <div className="ios-card mb-3">
      <SectionHeader icon={FileText} label="Notes" />
      {dayNote.notes.map((note, i) => (
        <p key={i} className="text-[14px] text-white/78 leading-relaxed">{note}</p>
      ))}
    </div>
  )
}

function GoalsSection({ dateStr }) {
  const goals = useGoals()
  const active = goals.filter(g => !g.completed)

  if (!active.length) return null

  return (
    <div className="ios-card mb-3">
      <SectionHeader icon={Target} label="Active Goals" />
      <div className="ios-group overflow-hidden">
        {active.map(goal => {
          const pct = goal.start != null && goal.target != null && goal.start !== goal.target
            ? Math.max(0, Math.min(1, Math.abs((goal.current ?? goal.start) - goal.start) / Math.abs(goal.target - goal.start)))
            : null
          return (
            <div key={goal.id} className="ios-row">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[13px] text-white/85 font-medium flex-1 min-w-0 truncate">{goal.title}</span>
                {goal.current != null && goal.target != null && (
                  <span className="forge-mono text-[12px] text-white/45 tabular-nums shrink-0">
                    {goal.current} / {goal.target}
                  </span>
                )}
              </div>
              {pct != null && (
                <div className="h-[2px] rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct * 100}%`,
                      background: 'linear-gradient(90deg, #c43050, #e05070)',
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Accountability() {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const isCurrentDay = date === todayStr
  const displayDate = format(parseISO(date + 'T12:00:00'), 'EEEE, d MMMM yyyy')

  function prevDay() {
    setDate(d => format(subDays(parseISO(d + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  }

  function nextDay() {
    if (date >= todayStr) return
    setDate(d => format(addDays(parseISO(d + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {/* Day navigator */}
      <div className="shrink-0 border-b border-white/[0.07] bg-realm-bg/80 backdrop-blur-xl px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={prevDay}
            className="glass-icon-btn"
            aria-label="Previous day"
          >
            <ChevronLeft size={16} strokeWidth={2} className="text-white/60" />
          </button>

          <div className="flex-1 text-center">
            <p className="text-[15px] font-semibold text-white/92 tracking-tight">{displayDate}</p>
            {isCurrentDay && (
              <p className="text-[11px] text-realm-gold/80 font-medium tracking-wide uppercase mt-0.5">Today</p>
            )}
          </div>

          <button
            type="button"
            onClick={nextDay}
            disabled={isCurrentDay}
            className="glass-icon-btn disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next day"
          >
            <ChevronRight size={16} strokeWidth={2} className="text-white/60" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto fl-scrollbar-none">
        <div className="max-w-2xl mx-auto px-4 py-4 pb-8">
          <CheckInSection dateStr={date} />
          <FoodSection dateStr={date} />
          <WorkoutSection dateStr={date} />
          <OutboundSection dateStr={date} />
          <TodosSection dateStr={date} />
          <NotesSection dateStr={date} />
          <GoalsSection dateStr={date} />
        </div>
      </div>
    </div>
  )
}
