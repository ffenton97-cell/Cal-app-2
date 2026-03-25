import { db } from '../db'

/**
 * Remember exercise names for autocomplete (datalist), bumping recency on each save.
 */
export async function upsertExerciseCatalogFromWorkout(exercises) {
  const now = Date.now()
  for (const ex of exercises || []) {
    const name = (ex?.name || '').trim()
    if (!name) continue
    const row = await db.exerciseCatalog.where('name').equals(name).first()
    if (row) await db.exerciseCatalog.update(row.id, { lastUsedAt: now })
    else await db.exerciseCatalog.add({ name, lastUsedAt: now })
  }
}

/** Build batch slots from current editor state (names + how many sets each). */
export function slotsFromExercises(exercises) {
  return exercises
    .filter((e) => (e.name || '').trim())
    .map((e) => ({
      name: e.name.trim(),
      setCount: Math.max(1, e.sets?.length || 1),
    }))
}

/** Hydrate editor exercises from a saved batch (fresh ids, empty weight/reps). */
export function exercisesFromSlots(slots) {
  return (slots || []).map((s) => ({
    id: crypto.randomUUID(),
    name: s.name || '',
    sets: Array.from({ length: Math.max(1, s.setCount || 1) }, () => ({
      weight: '',
      reps: '',
    })),
  }))
}

export async function saveWorkoutBatch({ name, type, slots }) {
  const trimmed = (name || '').trim()
  if (!trimmed || !slots?.length) return null
  const id = crypto.randomUUID()
  await db.workoutBatches.put({
    id,
    name: trimmed,
    type: type ?? null,
    created: new Date().toISOString(),
    slots,
  })
  return id
}

export async function deleteWorkoutBatch(id) {
  await db.workoutBatches.delete(id)
}
