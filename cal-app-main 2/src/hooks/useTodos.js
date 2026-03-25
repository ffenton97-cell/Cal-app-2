import { useLiveQuery } from 'dexie-react-hooks'
import { format, addDays } from 'date-fns'
import { db } from '../db'

export function useTodos() {
  return useLiveQuery(() => db.todos.orderBy('created').reverse().toArray(), []) ?? []
}

export async function saveTodo(data) {
  return db.todos.put(data)
}

export async function toggleTodo(id) {
  const todo = await db.todos.get(id)
  if (!todo) return

  if (todo.done) {
    return db.todos.put({ ...todo, done: false, completedDate: null })
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  await db.todos.put({
    ...todo,
    done: true,
    completedDate: today,
    missedWhy: null,
    missedWhyAt: null,
  })

  // Spawn next recurrence
  if (todo.recur && todo.recurDays > 0) {
    const base    = todo.due ? new Date(todo.due + 'T00:00:00') : new Date()
    const nextDue = format(addDays(base, todo.recurDays), 'yyyy-MM-dd')
    await db.todos.put({
      ...todo,
      id:           crypto.randomUUID(),
      done:         false,
      completedDate: null,
      due:          nextDue,
      originalDue:  nextDue,
      created:      new Date().toISOString(),
      missedWhy:    null,
      missedWhyAt:  null,
    })
  }
}

/** Accountability note for overdue / missed tasks (shown on Todos). */
export async function saveMissedAccountability(id, text) {
  const todo = await db.todos.get(id)
  if (!todo) return
  const today = format(new Date(), 'yyyy-MM-dd')
  const trimmed = text?.trim() || ''
  await db.todos.put({
    ...todo,
    missedWhy: trimmed || null,
    missedWhyAt: trimmed ? today : null,
  })
}

export async function deleteTodo(id) {
  return db.todos.delete(id)
}
