import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../db'

export function useFood(dateStr) {
  const today = dateStr ?? format(new Date(), 'yyyy-MM-dd')
  return useLiveQuery(() => db.food.get(today), [today])
}

async function upsertFood(dateStr, updater) {
  const existing = await db.food.get(dateStr)
  const base = existing ?? { date: dateStr, meals: [], totalCal: 0, totalProtein: 0, notes: null }
  return db.food.put(updater(base))
}

export async function addMeal(dateStr, meal) {
  return upsertFood(dateStr, r => {
    const meals = [...(r.meals ?? []), meal]
    return { ...r, meals, totalCal: tally(meals, 'cal'), totalProtein: tally(meals, 'protein') }
  })
}

export async function removeMeal(dateStr, mealId) {
  return upsertFood(dateStr, r => {
    const meals = (r.meals ?? []).filter(m => m.id !== mealId)
    return { ...r, meals, totalCal: tally(meals, 'cal'), totalProtein: tally(meals, 'protein') }
  })
}

export async function saveFoodNotes(dateStr, notes) {
  return upsertFood(dateStr, r => ({ ...r, notes }))
}

function tally(meals, field) {
  return meals.reduce((s, m) => s + (m[field] || 0), 0)
}
