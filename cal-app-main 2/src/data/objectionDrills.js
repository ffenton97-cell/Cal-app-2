/** Recruiter objection drills — tier unlocks by drill streak (spec). */

export const DRILL_TIERS = {
  1: {
    label: 'Standard',
    scenarios: [
      "PROSPECT: \"I'm not really looking right now — happy in my current role.\"\nYou say:",
      'PROSPECT: "Just send me the JD, I\'ll have a look."\nYou say:',
      'PROSPECT: "We\'re not hiring this quarter."\nYou say:',
      'PROSPECT: "I don\'t take recruiter calls."\nYou say:',
      'PROSPECT: "Call me back next month."\nYou say:',
    ],
  },
  2: {
    label: 'Hostile prospects',
    scenarios: [
      'PROSPECT: "You people all say the same thing. Why should I trust you?"\nYou say:',
      'PROSPECT: "I already have three recruiters. I don\'t need another."\nYou say:',
      'PROSPECT: "This feels like a sales pitch. I\'m not buying."\nYou say:',
      'PROSPECT: "Your fee model is a joke."\nYou say:',
    ],
  },
  3: {
    label: 'Board-level stakeholders',
    scenarios: [
      'PROSPECT (CFO): "We\'re freezing external spend. There\'s no budget for search."\nYou say:',
      'PROSPECT (CEO): "I only take intros from people I know."\nYou say:',
      'PROSPECT: "Our board wants an internal hire only."\nYou say:',
      'PROSPECT: "Send a one-pager and we\'ll circle back in Q3."\nYou say:',
    ],
  },
}

export function tierForDrillStreak(streak) {
  if (streak >= 30) return 3
  if (streak >= 7) return 2
  return 1
}

export function scenarioForToday(dateStr, tier) {
  const t = DRILL_TIERS[tier] || DRILL_TIERS[1]
  const list = t.scenarios
  let h = 0
  for (let i = 0; i < dateStr.length; i++) h = (Math.imul(31, h) + dateStr.charCodeAt(i)) | 0
  const i = Math.abs(h) % list.length
  return { scenario: list[i], tierLabel: t.label }
}
