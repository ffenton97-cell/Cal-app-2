import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Dumbbell, CheckCheck, Zap, Plus, AlertTriangle, Library, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useWorkout, saveWorkout } from '../hooks/useWorkout'
import { useEntry } from '../hooks/useEntry'
import { awardXP } from '../hooks/useXP'
import { XP as XP_VALUES } from '../theme'
import { db } from '../db'
import {
  upsertExerciseCatalogFromWorkout,
  slotsFromExercises,
  exercisesFromSlots,
  saveWorkoutBatch,
  deleteWorkoutBatch,
} from '../lib/workoutLibrary.js'
import { calcStreak } from '../hooks/useStreaks.js'
import { fetchXPContext } from '../lib/xpContext.js'
import SectionLabel from '../components/SectionLabel'

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES = ['PUSH', 'PULL', 'LEGS', 'UPPER', 'ARMS', 'CARDIO', 'OTHER']

const EXERCISE_DATALIST_ID = 'gym-exercise-name-hints'

function newExercise(name = '') {
  return { id: crypto.randomUUID(), name, sets: [{ weight: '', reps: '' }] }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatChip({ label, value }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1 py-3">
      <span className="ff-mono text-[17px] text-realm-gold tabular-nums font-medium">{value}</span>
      <span className="ios-label">{label}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Workout({ onXP }) {
  const todayStr      = format(new Date(), 'yyyy-MM-dd')
  const existing      = useWorkout()
  const todayEntry    = useEntry()
  const workoutStreak = useLiveQuery(() => calcStreak('workouts'), [])

  // form state
  const [wtype,      setWtype]      = useState(null)
  const [duration,   setDuration]   = useState('')
  const [exercises,  setExercises]  = useState([])
  const [notes,      setNotes]      = useState('')
  const [saved,      setSaved]      = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [programModal, setProgramModal] = useState(null) // 'save' | 'load' | null
  const [batchNameDraft, setBatchNameDraft] = useState('')
  const [loadedProgramLabel, setLoadedProgramLabel] = useState(null)

  const exerciseHints = useLiveQuery(
    () => db.exerciseCatalog.orderBy('lastUsedAt').reverse().limit(300).toArray(),
    []
  )
  const savedBatches = useLiveQuery(
    () =>
      db.workoutBatches
        .orderBy('created')
        .reverse()
        .toArray(),
    []
  )

  const prefilled  = useRef(false)
  const alreadyXPd = useRef(false)

  // Pre-fill once when Dexie resolves
  useEffect(() => {
    if (existing === undefined) return
    if (prefilled.current) return
    prefilled.current = true
    if (!existing) return

    alreadyXPd.current = true
    setWtype(existing.type ?? null)
    setDuration(existing.duration != null ? String(existing.duration) : '')
    setExercises(
      Array.isArray(existing.exercises) && existing.exercises.length > 0
        ? existing.exercises
        : []
    )
    setNotes(existing.notes ?? '')
    setLoadedProgramLabel(existing.programName ?? null)
    setSaved(true)
  }, [existing])

  // ── computed ──
  const allSets      = exercises.flatMap(e => e.sets)
  const totalSets    = allSets.length
  const totalReps    = allSets.reduce((s, set) => s + (parseInt(set.reps) || 0), 0)
  const totalTonnage = allSets.reduce(
    (s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0
  )
  const tonnageDisplay = totalTonnage >= 1000
    ? `${(totalTonnage / 1000).toFixed(1)}t`
    : totalTonnage > 0 ? `${Math.round(totalTonnage)}kg` : '—'

  const namedExercises = exercises.filter(e => e.name.trim()).length
  const varietyBonus   = namedExercises >= 3 ? 2 : 0
  const volumeBonus    = totalSets >= 12 ? 3 : 0
  const xpGain         = alreadyXPd.current ? 0
    : XP_VALUES.logWorkout + varietyBonus + volumeBonus

  const gymConfirmed = todayEntry === undefined || !!todayEntry?.gym

  // ── exercise mutations ──
  function addExercise(name = '') {
    setExercises(prev => [...prev, newExercise(name)])
  }

  function removeExercise(id) {
    setExercises(prev => prev.filter(e => e.id !== id))
  }

  function updateExerciseName(id, name) {
    setExercises(prev => prev.map(e => e.id === id ? { ...e, name } : e))
  }

  function addSet(exerciseId) {
    setExercises(prev => prev.map(e =>
      e.id === exerciseId
        ? { ...e, sets: [...e.sets, { weight: '', reps: '' }] }
        : e
    ))
  }

  function updateSet(exerciseId, idx, field, value) {
    setExercises(prev => prev.map(e => {
      if (e.id !== exerciseId) return e
      const sets = e.sets.map((s, i) => i === idx ? { ...s, [field]: value } : s)
      return { ...e, sets }
    }))
  }

  function removeSet(exerciseId, idx) {
    setExercises(prev => prev.map(e => {
      if (e.id !== exerciseId) return e
      if (e.sets.length <= 1) return e
      return { ...e, sets: e.sets.filter((_, i) => i !== idx) }
    }))
  }

  // ── submit ──
  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)

    const cleanExercises = exercises
      .filter(e => e.name.trim())
      .map(e => ({
        ...e,
        sets: e.sets.filter(s => s.reps !== '' || s.weight !== ''),
      }))

    await saveWorkout(todayStr, {
      type:      wtype,
      duration:  duration ? parseInt(duration, 10) : null,
      notes:     notes.trim() || null,
      exercises: cleanExercises,
      programName: loadedProgramLabel?.trim() || null,
    })
    await upsertExerciseCatalogFromWorkout(cleanExercises)

    if (!alreadyXPd.current) {
      alreadyXPd.current = true
      const ctx = await fetchXPContext()
      const { unlockedAchievements } = await awardXP(xpGain, ctx)
      onXP?.({ amount: xpGain, achievement: unlockedAchievements[0] ?? null })
    }

    setSaved(true)
    setSubmitting(false)
  }

  function applyBatch(batch) {
    const hasNamed = exercises.some((e) => (e.name || '').trim())
    if (
      hasNamed &&
      !window.confirm('Replace current exercises with this program? Unsaved names on screen will be lost.')
    ) {
      return
    }
    setExercises(exercisesFromSlots(batch.slots))
    if (batch.type) setWtype(batch.type)
    setLoadedProgramLabel(batch.name)
    setProgramModal(null)
  }

  async function handleSaveBatch() {
    const slots = slotsFromExercises(exercises)
    if (!batchNameDraft.trim() || slots.length === 0) return
    await saveWorkoutBatch({
      name: batchNameDraft.trim(),
      type: wtype,
      slots,
    })
    setBatchNameDraft('')
    setProgramModal(null)
  }

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">
      <datalist id={EXERCISE_DATALIST_ID}>
        {(exerciseHints ?? []).map((row) => (
          <option key={row.id} value={row.name} />
        ))}
      </datalist>

      {/* header */}
      <div className="mb-4">
        <h1 className="ios-title">
          TRAINING LOG
        </h1>
        <p className="text-[11px] text-realm-faint mt-1">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* streak + xp row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-realm-panel border border-realm-hairline">
          <Dumbbell size={12} className="text-realm-gold" />
          <span className="ff-mono text-[12px] text-realm-text tabular-nums">
            {workoutStreak ?? 0}
          </span>
          <span className="ff-mono text-[10px] text-realm-muted">session streak</span>
        </div>

        <div className="ml-auto flex items-center gap-1 px-2.5 py-1.5
          bg-realm-gold/10 border border-realm-gold/25">
          <Zap size={11} className="text-realm-gold" />
          <span className="ff-mono text-[12px] text-realm-gold font-medium">
            {alreadyXPd.current ? 'FILED'
              : xpGain > 0 ? `+${xpGain} XP` : '+15 XP'}
          </span>
        </div>
      </div>

      {/* gym not confirmed */}
      {!gymConfirmed && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2
          border-l-2 border-[#fbbf24] bg-[#fbbf2408]">
          <AlertTriangle size={11} className="text-[#fbbf24] shrink-0" />
          <span className="ff-mono text-[11px] text-[#fbbf24] tracking-widest uppercase">
            Gym not confirmed in check-in
          </span>
        </div>
      )}

      {/* filed banner */}
      {saved && (
        <div className="flex items-center gap-2 mb-5 px-3 py-2
          bg-[#4ade8010] border border-[#4ade8028]">
          <CheckCheck size={12} className="text-[#4ade80] shrink-0" />
          <span className="ff-mono text-[11px] text-[#4ade80] tracking-widest uppercase">
            Session on file — tap to edit
          </span>
        </div>
      )}

      {/* ── SESSION PROGRAM (saved batches) ── */}
      <div className="mb-5">
        <SectionLabel>Session program</SectionLabel>
        <p className="ff-mono text-[10px] text-realm-muted mb-2 leading-relaxed">
          Save this lineup as a named batch (e.g. Push day one, Pull day one). Load a batch to drop in
          exercise names and set counts — then enter weight and reps.
        </p>
        {loadedProgramLabel && (
          <p className="ff-mono text-[10px] text-realm-gold mb-2">
            Loaded: <span className="text-realm-text-soft">{loadedProgramLabel}</span>
            <button
              type="button"
              onClick={() => setLoadedProgramLabel(null)}
              className="ml-2 text-realm-muted hover:text-realm-ember uppercase tracking-wider"
            >
              Clear tag
            </button>
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setProgramModal('load')
              setBatchNameDraft('')
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 ff-mono text-[10px] uppercase tracking-wider border border-realm-border text-realm-soft hover:border-realm-gold/45 hover:text-realm-gold transition-colors"
          >
            <Library size={14} />
            Load program
          </button>
          <button
            type="button"
            onClick={() => {
              setProgramModal('save')
              setBatchNameDraft(loadedProgramLabel || '')
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 ff-mono text-[10px] uppercase tracking-wider border border-realm-gold/35 text-realm-gold hover:bg-realm-gold/10 transition-colors"
          >
            Save as program
          </button>
        </div>
      </div>

      {programModal === 'save' && (
        <div className="mb-5 border border-realm-gold/25 bg-realm-gold/8 p-3 rounded-md space-y-2">
          <p className="ff-mono text-[10px] text-realm-gold uppercase tracking-widest">Name this program</p>
          <input
            type="text"
            value={batchNameDraft}
            onChange={(e) => setBatchNameDraft(e.target.value)}
            placeholder="e.g. Push day one"
            className="fl-input ff-mono text-[13px]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveBatch}
              disabled={!batchNameDraft.trim() || !exercises.some((e) => (e.name || '').trim())}
              className="flex-1 py-2 ff-mono text-[11px] uppercase border border-realm-gold text-realm-gold disabled:opacity-30"
            >
              Save batch
            </button>
            <button
              type="button"
              onClick={() => setProgramModal(null)}
              className="px-3 py-2 ff-mono text-[10px] text-realm-muted uppercase"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {programModal === 'load' && (
        <div className="mb-5 ios-card space-y-2 max-h-56 overflow-y-auto">
          <p className="ios-label">Your programs</p>
          {savedBatches === undefined ? (
            <p className="ff-mono text-[11px] text-realm-faint">Loading…</p>
          ) : savedBatches.length === 0 ? (
            <p className="ff-mono text-[11px] text-realm-muted">No saved programs yet — add exercises and tap Save as program.</p>
          ) : (
            <ul className="space-y-1.5">
              {savedBatches.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-2 rounded-xl bg-realm-panel border border-realm-hairline px-2 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="ff-mono text-[12px] text-realm-text truncate">{b.name}</p>
                    <p className="ff-mono text-[9px] text-realm-faint">
                      {(b.slots || []).length} moves
                      {b.type ? ` · ${b.type}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyBatch(b)}
                    className="shrink-0 px-2 py-1 ff-mono text-[9px] uppercase text-realm-gold border border-realm-gold/35"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`Delete “${b.name}”?`)) return
                      await deleteWorkoutBatch(b.id)
                    }}
                    className="shrink-0 p-1.5 text-realm-faint hover:text-realm-ember"
                    aria-label={`Delete ${b.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setProgramModal(null)}
            className="w-full py-2 ff-mono text-[10px] text-realm-muted uppercase"
          >
            Close
          </button>
        </div>
      )}

      {/* ── WORKOUT TYPE ── */}
      <div className="mb-5">
        <SectionLabel>Workout Type</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setWtype(wtype === t ? null : t)}
              className="px-3 py-2 ff-mono text-[11px] uppercase tracking-widest border
                transition-all duration-150"
              style={{
                borderColor:     wtype === t ? '#d4a853' : '#252525',
                color:           wtype === t ? '#d4a853' : '#3a3a3a',
                backgroundColor: wtype === t ? '#d4a85314' : '#161616',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── DURATION ── */}
      <div className="mb-5">
        <SectionLabel>Duration</SectionLabel>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="—"
            className="fl-input ff-mono text-lg text-center py-2 w-20"
          />
          <span className="ff-mono text-realm-muted text-sm">min</span>
        </div>
      </div>

      {/* ── EXERCISES ── */}
      <div className="mb-4">
        <SectionLabel>Exercises</SectionLabel>
        <p className="ff-mono text-[10px] text-realm-muted mb-2">
          Type each exercise name (suggestions appear from your history). Add sets per lift below.
        </p>

        <div className="space-y-2">
          {exercises.map((ex) => (
            <div key={ex.id} className="ios-group">

              {/* exercise name header */}
              <div className="flex items-center gap-2 px-3 pt-2.5 pb-2
                border-b border-realm-hairline">
                <input
                  type="text"
                  value={ex.name}
                  onChange={(e) => updateExerciseName(ex.id, e.target.value)}
                  onBlur={(e) => {
                    const n = e.target.value.trim()
                    if (n) upsertExerciseCatalogFromWorkout([{ name: n, sets: ex.sets }])
                  }}
                  list={EXERCISE_DATALIST_ID}
                  autoComplete="off"
                  placeholder="Exercise name"
                  className="flex-1 bg-transparent outline-none ff-mono text-[13px]
                    text-realm-text placeholder:text-realm-faint border-none"
                />
                <button
                  type="button"
                  onClick={() => removeExercise(ex.id)}
                  className="ff-mono text-[#2a2a2a] hover:text-[#f87171] transition-colors
                    text-base leading-none"
                >
                  ×
                </button>
              </div>

              {/* sets */}
              <div className="px-3 py-2 space-y-1.5">
                {ex.sets.map((set, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="ff-mono text-[10px] text-[#2a2a2a] w-3.5 tabular-nums text-right shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={set.weight}
                      onChange={e => updateSet(ex.id, idx, 'weight', e.target.value)}
                      placeholder="—"
                      className="fl-input ff-mono text-sm text-center py-1 w-16"
                    />
                    <span className="ff-mono text-[11px] text-realm-faint shrink-0">kg ×</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={set.reps}
                      onChange={e => updateSet(ex.id, idx, 'reps', e.target.value)}
                      placeholder="—"
                      className="fl-input ff-mono text-sm text-center py-1 w-14"
                    />
                    {ex.sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSet(ex.id, idx)}
                        className="ff-mono text-[#2a2a2a] hover:text-[#f87171]
                          transition-colors text-sm ml-auto"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addSet(ex.id)}
                  className="ff-mono text-[10px] text-realm-faint hover:text-realm-gold
                    transition-colors uppercase tracking-widest mt-0.5
                    flex items-center gap-1"
                >
                  <Plus size={9} />
                  Add Set
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* add exercise */}
        <button
          type="button"
          onClick={() => addExercise()}
          className="mt-3 w-full py-2.5 ff-mono text-[11px] uppercase tracking-[0.15em]
            border border-dashed border-realm-border text-realm-faint
            hover:border-realm-gold/45 hover:text-realm-muted transition-all duration-150
            flex items-center justify-center gap-1.5"
        >
          <Plus size={12} />
          Add Exercise
        </button>
      </div>

      {/* ── VOLUME STATS ── */}
      {totalSets > 0 && (
        <div className="mb-5">
          <SectionLabel>Volume</SectionLabel>
          <div className="flex ios-group divide-x divide-realm-border">
            <StatChip label="Sets"    value={totalSets} />
            <StatChip label="Reps"    value={totalReps || '—'} />
            <StatChip label="Tonnage" value={tonnageDisplay} />
          </div>
          {(varietyBonus > 0 || volumeBonus > 0) && !alreadyXPd.current && (
            <div className="flex gap-2 mt-1.5">
              {varietyBonus > 0 && (
                <span className="ff-mono text-[10px] text-realm-gold">
                  +{varietyBonus} XP variety bonus
                </span>
              )}
              {volumeBonus > 0 && (
                <span className="ff-mono text-[10px] text-realm-gold">
                  +{volumeBonus} XP volume bonus
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── NOTES ── */}
      <div className="mb-6">
        <SectionLabel>Notes</SectionLabel>
        <textarea
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="How'd it go? PRs, new weights, technique notes…"
          className="fl-input ff-mono text-[13px] resize-none"
          style={{ padding: '0.6rem 0.75rem' }}
        />
      </div>

      {/* ── SUBMIT ── */}
      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        className="w-full py-4 ff-mono text-[13px] tracking-[0.2em] uppercase
          font-medium border transition-all duration-150 active:scale-[0.995]"
        style={{
          borderColor:     submitting ? '#252525' : '#d4a853',
          color:           submitting ? '#333'    : '#d4a853',
          backgroundColor: submitting ? '#161616' : '#d4a85316',
        }}
      >
        {submitting
          ? 'Saving…'
          : saved
            ? 'Update Session'
            : `Log Session${xpGain > 0 ? ` — +${xpGain} XP` : ''}`}
      </button>

    </div>
  )
}
