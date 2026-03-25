import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../db'

export function useGoals() {
  return useLiveQuery(() => db.goals.toArray(), []) ?? []
}

export async function saveGoal(data) {
  return db.goals.put(data)
}

export async function logGoalProgress(id, value) {
  const goal = await db.goals.get(id)
  if (!goal) return
  const history  = [...(goal.history ?? []), { date: format(new Date(), 'yyyy-MM-dd'), value }]
  const inverted = goal.target < goal.start   // e.g. weight loss
  const done     = inverted ? value <= goal.target : value >= goal.target
  return db.goals.put({ ...goal, current: value, history, completed: done || !!goal.completed })
}

export async function deleteGoal(id) {
  return db.goals.delete(id)
}
