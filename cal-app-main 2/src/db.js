import Dexie from 'dexie'

export const db = new Dexie('FieldLogDB')

db.version(1).stores({
  // Daily check-in: one record per date
  entries:  '&date, weight, protein, cals, mood, moodWord, gym, win, sales',

  // Workout sessions: one record per date
  workouts: '&date, type, notes, *exercises',

  // Food / nutrition: one record per date
  food:     '&date, *meals, totalCal, totalProtein, notes',

  // Sales / outbound activity: one record per date
  outbound: '&date, calls, connected, convos, emails, replies, meetings, liConnects, liAccepted, liDms, notes',

  // Todos / tasks
  todos:    '&id, title, category, priority, due, originalDue, recur, recurDays, done, completedDate, created, notes',

  // Free-form day notes (multiple per date)
  dayNotes: '&date, *notes',

  // Goals
  goals:    '&id, title, category, start, current, target, unit, deadline, why, completed, *history',

  // Body composition scans (DEXA / InBody / etc.)
  scans:    '&id, date, weight, bf, lean, fat, bmd, visceral, ffmi, arms, legs, trunk, android, notes',

  // Finance snapshots
  finance:  '&id, date, assets, liabilities, netWorth, income, expenses, cash, super, invest, propval, mortgage, hecs, notes',

  // XP / gamification — single row keyed by a fixed id
  xp:       '&id, totalXp, earnedToday, earnedAchievements, lastUpdated',
})

// v2: personal milestones (birthdays, Valentine’s, anniversaries…)
db.version(2).stores({
  importantDates:
    '&id, title, month, day, year, notes, created',
})

// v3: sales mindset UX (singleton) + filed quotes (armoury)
db.version(3).stores({
  salesUX: '&id',
  armoury: '&id, filedAt, category',
})

// v4: gym — saved exercise names (autocomplete) + session program batches
db.version(4).stores({
  exerciseCatalog: '++id, &name, lastUsedAt',
  workoutBatches: '&id, name, created',
})

// v5: timed day blocks (meetings, focus blocks) — local only, no calendar sync
db.version(5).stores({
  dayEvents: '&id, date, startMin, created',
})

function bumpSyncDirty() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fieldlog-data-mutated'))
  }
}

for (const table of [
  db.entries,
  db.workouts,
  db.food,
  db.outbound,
  db.todos,
  db.dayNotes,
  db.goals,
  db.scans,
  db.finance,
  db.xp,
  db.importantDates,
  db.salesUX,
  db.armoury,
  db.exerciseCatalog,
  db.workoutBatches,
  db.dayEvents,
]) {
  table.hook('creating', bumpSyncDirty)
  table.hook('updating', bumpSyncDirty)
  table.hook('deleting', bumpSyncDirty)
}

export default db
