import { db } from './db'

const SEED_KEY = 'fieldlog_seeded_v1'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`
const d = (day) => `2026-03-${String(day).padStart(2, '0')}`

// ─── Workout helpers ──────────────────────────────────────────────────────────
const sets = (reps, weight, count = 3) =>
  Array.from({ length: count }, () => ({ reps, weight, done: true }))

const ex = (name, setsArr) => ({ name, sets: setsArr })

// ─── Workout sessions ────────────────────────────────────────────────────────
// 23 sessions March 1–25 (rest: Mar 8 Sun, Mar 22 Sun)
const WORKOUTS = [
  {
    date: d(1), type: 'Push – Chest / Shoulders / Tris',
    exercises: [
      ex('Flat Barbell Bench Press',   [...sets(5, 100, 3), ...sets(5, 97.5)]),
      ex('Incline DB Press',           sets(10, 32)),
      ex('Cable Crossover',            sets(12, 15)),
      ex('Overhead Press (BB)',        sets(8, 70, 4)),
      ex('Lateral Raise',             sets(15, 12)),
      ex('Tricep Pushdown',           sets(12, 22.5)),
    ],
    notes: 'Felt strong. Bench PR attempt next week.',
  },
  {
    date: d(2), type: 'Pull – Back / Biceps',
    exercises: [
      ex('Weighted Pull-Up',          sets(6, 10, 4)),
      ex('Barbell Row',               sets(8, 90, 4)),
      ex('Cable Row (wide grip)',      sets(10, 65)),
      ex('Face Pull',                 sets(15, 20)),
      ex('Barbell Curl',              sets(10, 42.5)),
      ex('Hammer Curl',               sets(12, 18)),
    ],
    notes: '',
  },
  {
    date: d(3), type: 'Legs – Quad Focus',
    exercises: [
      ex('Back Squat',                sets(5, 120, 4)),
      ex('Leg Press',                 sets(12, 180, 3)),
      ex('Bulgarian Split Squat',     sets(10, 30, 3)),
      ex('Leg Extension',             sets(15, 55)),
      ex('Seated Calf Raise',         sets(20, 50)),
    ],
    notes: 'Knees felt good. Added 2.5kg to squat.',
  },
  {
    date: d(4), type: 'Push – Shoulders Focus',
    exercises: [
      ex('Overhead Press (BB)',       sets(6, 75, 4)),
      ex('Arnold Press',              sets(10, 24)),
      ex('Lateral Raise',            sets(15, 13)),
      ex('Front Raise',              sets(12, 10)),
      ex('Incline DB Press',         sets(12, 34)),
      ex('Skull Crusher',            sets(10, 37.5)),
      ex('Cable Tricep Pushdown',    sets(15, 20)),
    ],
    notes: '',
  },
  {
    date: d(5), type: 'Pull – Back / Biceps',
    exercises: [
      ex('Deadlift',                  [...sets(3, 150), ...sets(3, 155)]),
      ex('T-Bar Row',                 sets(10, 70, 3)),
      ex('Lat Pulldown',             sets(10, 75)),
      ex('Incline DB Curl',          sets(12, 16)),
      ex('Reverse Curl',             sets(12, 25)),
    ],
    notes: 'Deadlift 155 × 3 — solid.',
  },
  {
    date: d(6), type: 'Legs – Ham / Glute Focus',
    exercises: [
      ex('Romanian Deadlift',         sets(8, 110, 4)),
      ex('Leg Curl (lying)',          sets(12, 40, 3)),
      ex('Hip Thrust',                sets(10, 100, 4)),
      ex('Walking Lunge',            sets(12, 20)),
      ex('Standing Calf Raise',      sets(15, 90)),
    ],
    notes: '',
  },
  {
    date: d(7), type: 'Upper Body – Strength',
    exercises: [
      ex('Flat Barbell Bench Press',  sets(3, 100, 5)),
      ex('Weighted Pull-Up',         sets(5, 12.5, 5)),
      ex('DB Shoulder Press',        sets(8, 30, 3)),
      ex('Barbell Row',              sets(6, 95, 3)),
      ex('Dips (weighted)',          sets(10, 15, 3)),
    ],
    notes: 'Upper body strength day — all lifts up.',
  },
  // March 8 — REST
  {
    date: d(9), type: 'Push – Chest / Shoulders / Tris',
    exercises: [
      ex('Flat Barbell Bench Press',  sets(5, 102.5, 3)),
      ex('Incline DB Press',          sets(10, 34)),
      ex('Pec Deck Fly',             sets(12, 50)),
      ex('Overhead Press (BB)',       sets(8, 72.5, 3)),
      ex('Lateral Raise',            sets(15, 13)),
      ex('Tricep Rope Pushdown',     sets(12, 20)),
    ],
    notes: 'Small bench PR — 102.5 × 5 × 3.',
  },
  {
    date: d(10), type: 'Pull – Back / Biceps',
    exercises: [
      ex('Weighted Pull-Up',         sets(6, 12.5, 4)),
      ex('Barbell Row',              sets(8, 92.5, 3)),
      ex('Seated Cable Row',         sets(10, 70)),
      ex('Face Pull',                sets(15, 22.5)),
      ex('EZ Bar Curl',             sets(10, 37.5)),
      ex('Concentration Curl',      sets(12, 14)),
    ],
    notes: '',
  },
  {
    date: d(11), type: 'Legs – Quad Focus',
    exercises: [
      ex('Back Squat',               sets(5, 122.5, 4)),
      ex('Front Squat',              sets(6, 80, 3)),
      ex('Leg Press',                sets(12, 185)),
      ex('Leg Extension',           sets(15, 57.5)),
      ex('Seated Calf Raise',       sets(20, 52.5)),
    ],
    notes: '122.5 squat felt smooth.',
  },
  {
    date: d(12), type: 'Push – Shoulders / Chest',
    exercises: [
      ex('Overhead Press (BB)',      sets(6, 77.5, 4)),
      ex('Cable Lateral Raise',     sets(15, 12.5)),
      ex('DB Front Raise',          sets(12, 11)),
      ex('Incline Barbell Press',   sets(8, 85, 3)),
      ex('Dips (weighted)',         sets(10, 17.5, 3)),
      ex('Overhead Tricep Ext',     sets(12, 30)),
    ],
    notes: '',
  },
  {
    date: d(13), type: 'Pull – Back / Biceps',
    exercises: [
      ex('Deadlift',                 sets(3, 157.5, 4)),
      ex('Chest-Supported Row',     sets(10, 65, 3)),
      ex('Lat Pulldown',            sets(12, 77.5)),
      ex('Barbell Curl',            sets(10, 45)),
      ex('Hammer Curl',             sets(12, 20)),
    ],
    notes: 'Deadlift all sets at 157.5 — progress.',
  },
  {
    date: d(14), type: 'Legs – Full',
    exercises: [
      ex('Back Squat',              sets(5, 122.5, 3)),
      ex('Romanian Deadlift',       sets(8, 112.5, 3)),
      ex('Hip Thrust',              sets(12, 102.5, 3)),
      ex('Leg Curl (seated)',       sets(12, 42.5)),
      ex('Leg Extension',          sets(15, 60)),
      ex('Standing Calf Raise',    sets(15, 95)),
    ],
    notes: 'Full leg session — gassed.',
  },
  {
    date: d(15), type: 'Cardio & Core',
    exercises: [
      ex('Rowing Machine',          [{ time: '20min', cal: 220, done: true }]),
      ex('Plank',                   [{ hold: '90s', sets: 3, done: true }]),
      ex('Hanging Leg Raise',       sets(15, 0, 3)),
      ex('Ab Wheel',               sets(12, 0, 3)),
      ex('Cable Crunch',           sets(15, 35)),
    ],
    notes: '20 min row, felt good.',
  },
  {
    date: d(16), type: 'Push – Chest / Shoulders / Tris',
    exercises: [
      ex('Flat Barbell Bench Press', sets(5, 102.5, 4)),
      ex('Incline DB Press',         sets(10, 34, 3)),
      ex('Cable Fly',               sets(12, 17.5)),
      ex('Overhead Press (BB)',      sets(8, 75, 3)),
      ex('Lateral Raise',           sets(15, 14)),
      ex('Tricep Pushdown',         sets(12, 22.5)),
    ],
    notes: 'Extra bench set added.',
  },
  {
    date: d(17), type: 'Pull – Back / Biceps',
    exercises: [
      ex('Weighted Pull-Up',        sets(6, 15, 4)),
      ex('Barbell Row',             sets(8, 95, 4)),
      ex('Straight-Arm Pulldown',  sets(12, 30)),
      ex('Reverse Pec Deck',       sets(15, 40)),
      ex('Barbell Curl',           sets(10, 45)),
      ex('Incline DB Curl',        sets(12, 17)),
    ],
    notes: 'Pull-up at +15kg × 6 — new best.',
  },
  {
    date: d(18), type: 'Legs – Quad Focus',
    exercises: [
      ex('Back Squat',             sets(5, 125, 4)),
      ex('Hack Squat',             sets(10, 100, 3)),
      ex('Leg Press',              sets(12, 190)),
      ex('Leg Extension',         sets(15, 60)),
      ex('Seated Calf Raise',     sets(20, 55)),
    ],
    notes: '125 squat — new working max.',
  },
  {
    date: d(19), type: 'Push – Shoulders Focus',
    exercises: [
      ex('Overhead Press (BB)',    sets(6, 77.5, 4)),
      ex('Arnold Press',           sets(10, 26)),
      ex('Lateral Raise',         sets(15, 14)),
      ex('Cable Fly (high)',       sets(12, 20)),
      ex('Close-Grip Bench',      sets(8, 80, 3)),
      ex('Skull Crusher',         sets(10, 40)),
    ],
    notes: '',
  },
  {
    date: d(20), type: 'Pull – Back / Biceps',
    exercises: [
      ex('Deadlift',               [...sets(1, 170), ...sets(3, 160, 3)]),
      ex('T-Bar Row',              sets(10, 75, 3)),
      ex('Lat Pulldown',          sets(10, 80)),
      ex('Face Pull',             sets(20, 22.5)),
      ex('EZ Bar Curl',          sets(10, 40)),
      ex('Hammer Curl',          sets(12, 20)),
    ],
    notes: '170 single! 160 × 3 × 3 after. Good day.',
  },
  {
    date: d(21), type: 'Legs – Ham / Glute Focus',
    exercises: [
      ex('Romanian Deadlift',     sets(8, 115, 4)),
      ex('Leg Curl (lying)',      sets(12, 42.5, 3)),
      ex('Hip Thrust',            sets(10, 105, 4)),
      ex('Walking Lunge',        sets(12, 22)),
      ex('Standing Calf Raise',  sets(15, 100)),
    ],
    notes: 'DXA scan morning — 69kg, 25.3% BF.',
  },
  // March 22 — REST
  {
    date: d(23), type: 'Upper Body – Hypertrophy',
    exercises: [
      ex('Incline DB Press',      sets(12, 34, 4)),
      ex('Cable Row',             sets(12, 72.5, 4)),
      ex('DB Shoulder Press',    sets(12, 28, 3)),
      ex('Lat Pulldown',         sets(12, 80)),
      ex('Cable Curl',           sets(15, 17.5)),
      ex('Tricep Pushdown',      sets(15, 22.5)),
    ],
    notes: 'Hypertrophy focus — pump session.',
  },
  {
    date: d(24), type: 'Pull – Back / Biceps',
    exercises: [
      ex('Weighted Pull-Up',     sets(5, 17.5, 5)),
      ex('Barbell Row',          sets(8, 97.5, 4)),
      ex('Seated Cable Row',     sets(10, 72.5)),
      ex('Chest-Supported Row', sets(10, 67.5)),
      ex('Barbell Curl',        sets(8, 47.5)),
      ex('Concentration Curl',  sets(12, 16)),
    ],
    notes: 'Pull-up +17.5 × 5 × 5 — PR.',
  },
  {
    date: d(25), type: 'Push – Chest / Shoulders / Tris',
    exercises: [
      ex('Flat Barbell Bench Press', sets(5, 105, 3)),
      ex('Incline DB Press',         sets(10, 36, 3)),
      ex('Pec Deck',                sets(15, 52.5)),
      ex('Overhead Press (BB)',     sets(6, 80, 3)),
      ex('Lateral Raise',          sets(15, 15)),
      ex('Tricep Rope Pushdown',   sets(15, 22.5)),
    ],
    notes: '105 bench — 2.5kg PR. 80 OHP for 6 — matching best.',
  },
]

// ─── DXA scan ────────────────────────────────────────────────────────────────
const SCAN = {
  id:       'scan_20260321',
  date:     '2026-03-21',
  weight:   69,
  bf:       25.3,
  lean:     49.48,
  fat:      17.46,
  bmd:      1.135,
  visceral: 405,
  ffmi:     19.8,
  arms:     null,
  legs:     null,
  trunk:    null,
  android:  31.9,
  notes:    'First DXA baseline. Goal: drop to 20% BF by end of year.',
}

// ─── Goals ───────────────────────────────────────────────────────────────────
const today = new Date()
const GOALS = [
  {
    id:       'goal_ev',
    title:    'Buy an EV',
    category: 'Finance',
    start:    22000,
    current:  22000,
    target:   65000,
    unit:     'AUD saved',
    deadline: '2027-06-30',
    why:      'Cut fuel costs, reduce emissions, long-term cheaper to run.',
    completed: false,
    history:  [{ date: '2026-03-01', value: 22000, note: 'Starting balance' }],
  },
  {
    id:       'goal_house',
    title:    'House upgrade – $1.6M property',
    category: 'Finance',
    start:    310000,
    current:  310000,
    target:   400000,
    unit:     'AUD equity / deposit',
    deadline: '2028-12-31',
    why:      'Family home upgrade — more space, better suburb.',
    completed: false,
    history:  [{ date: '2026-03-01', value: 310000, note: 'Starting equity' }],
  },
  {
    id:       'goal_bf',
    title:    'Drop body fat to 20%',
    category: 'Health',
    start:    25.3,
    current:  25.3,
    target:   20,
    unit:     '% body fat',
    deadline: '2026-12-31',
    why:      'Better performance, health markers, and aesthetics. DXA baseline set.',
    completed: false,
    history:  [{ date: '2026-03-21', value: 25.3, note: 'DXA scan baseline' }],
  },
  {
    id:       'goal_ote',
    title:    'Hit OTE $300k',
    category: 'Sales',
    start:    0,
    current:  0,
    target:   300000,
    unit:     'AUD earned (YTD)',
    deadline: '2026-12-31',
    why:      'Top performer comp target — base + commissions.',
    completed: false,
    history:  [{ date: '2026-03-01', value: 0, note: 'Year start' }],
  },
]

// ─── Default todos ────────────────────────────────────────────────────────────
// Fortnightly pay cycle starts 2026-03-27 (Friday)
// Weekly review: Sundays
// Outbound log: Mon–Fri
// Monthly finance: 1st of each month
const TODOS = [
  {
    id:           'todo_payday_debits',
    title:        'Check payday auto-debits',
    category:     'Finance',
    priority:     'high',
    due:          '2026-03-25',
    originalDue:  '2026-03-25',
    recur:        'fortnightly',
    recurDays:    null,
    done:         false,
    completedDate: null,
    created:      '2026-03-25',
    notes:        'Verify mortgage, super, insurances all cleared on payday.',
  },
  {
    id:           'todo_weekly_review',
    title:        'Weekly review',
    category:     'Productivity',
    priority:     'medium',
    due:          '2026-03-29',      // next Sunday
    originalDue:  '2026-03-29',
    recur:        'weekly',
    recurDays:    0,                 // 0 = Sunday
    done:         false,
    completedDate: null,
    created:      '2026-03-25',
    notes:        'Review goals, close open loops, plan coming week.',
  },
  {
    id:           'todo_outbound_log',
    title:        'Log outbound activity',
    category:     'Sales',
    priority:     'high',
    due:          '2026-03-25',
    originalDue:  '2026-03-25',
    recur:        'weekdays',
    recurDays:    null,
    done:         false,
    completedDate: null,
    created:      '2026-03-25',
    notes:        'Calls, emails, LinkedIn touches, meetings — log everything.',
  },
  {
    id:           'todo_finance_snapshot',
    title:        'Monthly finance snapshot',
    category:     'Finance',
    priority:     'medium',
    due:          '2026-04-01',
    originalDue:  '2026-04-01',
    recur:        'monthly',
    recurDays:    1,                 // 1st of each month
    done:         false,
    completedDate: null,
    created:      '2026-03-25',
    notes:        'Update net worth, investments, cash position in Finance page.',
  },
]

// ─── Seed function ────────────────────────────────────────────────────────────
export async function seedIfNeeded() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(SEED_KEY)) return

  await db.transaction('rw', db.workouts, db.scans, db.goals, db.todos, async () => {
    await db.workouts.bulkPut(WORKOUTS)
    await db.scans.put(SCAN)
    await db.goals.bulkPut(GOALS)
    await db.todos.bulkPut(TODOS)
  })

  localStorage.setItem(SEED_KEY, '1')
  console.log('[FORGE] Database seeded.')
}
