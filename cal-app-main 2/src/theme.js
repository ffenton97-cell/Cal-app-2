// ─── Color tokens (FORGE — align with index.css @theme) ─────────────────────
export const colors = {
  bg:        '#0c0809',
  surface:   '#1a0c10',
  surfaceHi: '#1c1418',
  border:    '#1c1416',
  muted:     'rgba(255,255,255,0.32)',
  text:      '#f5f0f0',
  textSoft:  'rgba(255,255,255,0.55)',
  gold:      '#e05070',
  goldDim:   '#c43050',
  goldGlow:  'rgba(224,80,112,0.1)',
  green:     '#89d185',
  red:       '#d4a050',
  amber:     '#d4a050',
  blue:      '#e05070',
  cyan:      '#89d185',
}

export const fonts = {
  heading: 'Inter, system-ui, -apple-system, sans-serif',
  mono:    'JetBrains Mono, ui-monospace, monospace',
}

// ─── XP values per action ─────────────────────────────────────────────────────
export const XP = {
  checkIn:      10,
  logWeight:     5,
  logFood:       8,
  logWorkout:   15,
  logOutbound:  10,
  completeTodo:  3,
  addGoal:       5,
  logScan:      10,
  logFinance:    5,
  journalEntry:  5,
  sessionLock:   5,
  objectionDrill: 5,
  enemyDefeated: 25,
}

// ─── Level thresholds ────────────────────────────────────────────────────────
export const LEVELS = [
  { level: 1,  xpRequired: 0,    title: 'Starter' },
  { level: 2,  xpRequired: 100,  title: 'Contributor' },
  { level: 3,  xpRequired: 250,  title: 'Regular' },
  { level: 4,  xpRequired: 500,  title: 'Established' },
  { level: 5,  xpRequired: 900,  title: 'Advanced' },
  { level: 6,  xpRequired: 1400, title: 'Expert' },
  { level: 7,  xpRequired: 2100, title: 'Veteran' },
  { level: 8,  xpRequired: 3000, title: 'Principal' },
  { level: 9,  xpRequired: 4200, title: 'Lead' },
  { level: 10, xpRequired: 6000, title: 'Director' },
]

export function getLevelInfo(totalXp = 0) {
  let current = LEVELS[0]
  let next    = LEVELS[1]
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].xpRequired) {
      current = LEVELS[i]
      next    = LEVELS[i + 1] || null
      break
    }
  }
  const xpIntoLevel = totalXp - current.xpRequired
  const xpForNext   = next ? next.xpRequired - current.xpRequired : 1
  const progress    = next ? Math.min(xpIntoLevel / xpForNext, 1) : 1
  return { current, next, xpIntoLevel, xpForNext, progress }
}

// ─── Achievements (15) ────────────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  // Check-in milestones
  { id: 'first_checkin',   label: 'First Check-In',     xp: 20,  icon: '🎯',
    desc: 'Log your first daily check-in.',
    test: (s) => s.totalCheckIns >= 1 },
  { id: 'streak_3',        label: '3-Day Streak',        xp: 25,  icon: '🔥',
    desc: 'Check in 3 days in a row.',
    test: (s) => s.checkInStreak >= 3 },
  { id: 'streak_7',        label: 'Week Warrior',        xp: 60,  icon: '⚡',
    desc: 'Check in 7 days in a row.',
    test: (s) => s.checkInStreak >= 7 },
  { id: 'streak_30',       label: 'Iron Discipline',     xp: 200, icon: '👑',
    desc: '30-day check-in streak.',
    test: (s) => s.checkInStreak >= 30 },

  // Workout milestones
  { id: 'first_workout',   label: 'First Set',           xp: 20,  icon: '💪',
    desc: 'Log your first workout.',
    test: (s) => s.totalWorkouts >= 1 },
  { id: 'workout_10',      label: 'Ten Sessions',        xp: 50,  icon: '🏋️',
    desc: 'Complete 10 workout sessions.',
    test: (s) => s.totalWorkouts >= 10 },
  { id: 'workout_50',      label: 'Fifty Sessions',      xp: 150, icon: '🔩',
    desc: 'Complete 50 workout sessions.',
    test: (s) => s.totalWorkouts >= 50 },

  // Goals
  { id: 'first_goal',      label: 'Goal Setter',         xp: 15,  icon: '📌',
    desc: 'Create your first goal.',
    test: (s) => s.totalGoals >= 1 },
  { id: 'goal_complete',   label: 'Goal Crusher',        xp: 100, icon: '✅',
    desc: 'Complete a goal.',
    test: (s) => s.completedGoals >= 1 },

  // Outbound / sales
  { id: 'first_outbound',  label: 'First Dial',          xp: 20,  icon: '📞',
    desc: 'Log your first outbound day.',
    test: (s) => s.outboundDays >= 1 },
  { id: 'outbound_50',     label: '50 Calls',            xp: 75,  icon: '📲',
    desc: 'Log 50 total calls.',
    test: (s) => s.totalCalls >= 50 },
  { id: 'outbound_500',    label: '500 Calls',           xp: 250, icon: '🏆',
    desc: 'Log 500 total calls.',
    test: (s) => s.totalCalls >= 500 },

  // Body / health
  { id: 'first_weight',    label: 'Weigh-In',            xp: 10,  icon: '⚖️',
    desc: 'Log your first weight.',
    test: (s) => s.totalWeightLogs >= 1 },
  { id: 'first_scan',      label: 'Body Scan',           xp: 30,  icon: '🔬',
    desc: 'Log a DXA / body composition scan.',
    test: (s) => s.totalScans >= 1 },

  // Finance
  { id: 'first_finance',   label: 'Balance Sheet',       xp: 20,  icon: '💰',
    desc: 'Log your first finance snapshot.',
    test: (s) => s.totalFinanceLogs >= 1 },
]

// ─── User defaults (Freddie) ──────────────────────────────────────────────────
export const USER = {
  name:         'Freddie',
  role:         'Head of Sales',
  company:      'Tendl',
  cutCals:      1850,
  cutProtein:   180,
  weightStart:  68.8,
  weightTarget: 65,
  // Payday: fortnightly Wednesdays from 2026-03-25
  paydayAnchor: '2026-03-25',
  paydayInterval: 14,         // days
}

/** getDay: Sun=0 … Sat=6 — scheduled gym times */
export const GYM_SCHEDULE = { 1: '05:45', 2: '05:45', 3: '05:45', 4: '18:00' }

export const FORGE_ICON_GRADIENT = 'linear-gradient(145deg, #c43050 0%, #1a0c10 100%)'
