/** Curated lines by psychological context (not random). */

function dayHash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export const QUOTE_CATEGORIES = {
  pressure: [
    { text: 'DISCIPLINE EQUALS FREEDOM.', author: 'JOCKO WILLINK' },
    { text: 'WHO’S GOING TO CARRY THE BOATS?', author: 'DAVID GOGGINS' },
    { text: 'DO NOT PRAY FOR AN EASY LIFE. PRAY FOR THE STRENGTH TO ENDURE A DIFFICULT ONE.', author: 'BRUCE LEE' },
    { text: 'YOU ARE NOT OWED A RESULT. YOU OWE THE WORK.', author: 'FORGE' },
    { text: 'THE OBSTACLE IS THE WAY.', author: 'MARCUS AURELIUS' },
  ],
  streak: [
    { text: 'REST AT THE END, NOT IN THE MIDDLE.', author: 'KOBE BRYANT' },
    { text: 'YOU COULD LEAVE LIFE RIGHT NOW. LET THAT DETERMINE WHAT YOU DO AND SAY AND THINK.', author: 'MARCUS AURELIUS' },
    { text: 'COMFORT IS A SLOW DEATH. STAY HUNGRY.', author: 'FORGE' },
    { text: 'WASTE NO MORE TIME ARGUING WHAT A GOOD MAN SHOULD BE. BE ONE.', author: 'MARCUS AURELIUS' },
  ],
  drained: [
    { text: 'IF YOU’RE GOING THROUGH HELL, KEEP GOING.', author: 'WINSTON CHURCHILL' },
    { text: 'THE WORLD BREAKS EVERYONE, AND AFTERWARD, SOME ARE STRONG AT THE BROKEN PLACES.', author: 'ERNEST HEMINGWAY' },
    { text: 'THE LAST THREE OR FOUR REPS IS WHAT MAKES THE MUSCLE GROW.', author: 'ARNOLD SCHWARZENEGGER' },
    { text: 'SHOW UP WHEN YOU DON’T WANT TO. THAT’S THE WHOLE JOB.', author: 'FORGE' },
  ],
  milestone: [
    { text: 'YOU GET WHAT YOU FOCUS ON. SO FOCUS ON THE RIGHT THINGS.', author: 'ALEX HORMOZI' },
    { text: 'THE ONLY WAY TO DO GREAT WORK IS TO LOVE WHAT YOU DO.', author: 'STEVE JOBS' },
    { text: 'SUCCESS IS GETTING WHAT YOU WANT. HAPPINESS IS WANTING WHAT YOU GET.', author: 'DALE CARNEGIE' },
    { text: 'RAISE THE STANDARD. WHAT GOT YOU HERE WON’T GET YOU THERE.', author: 'FORGE' },
  ],
  default: [
    { text: 'THE CAVE YOU FEAR TO ENTER HOLDS THE TREASURE YOU SEEK.', author: 'JOSEPH CAMPBELL' },
    { text: 'MOST PEOPLE ARE AFRAID OF SUFFERING. BUT SUFFERING IS A KIND OF MUD TO HELP THE LOTUS FLOWER GROW. THERE CAN BE NO LOTUS FLOWER WITHOUT THE MUD.', author: 'THICH NHAT HANH' },
    { text: 'WE ARE WHAT WE REPEATEDLY DO. EXCELLENCE, THEN, IS NOT AN ACT BUT A HABIT.', author: 'WILL DURANT' },
    { text: 'ACTION IS THE FOUNDATIONAL KEY TO ALL SUCCESS.', author: 'PABLO PICASSO' },
  ],
}

/**
 * Pick category from live signals, then a stable quote for that calendar day.
 */
export function pickQuoteContext(ctx) {
  const {
    behindOte,
    gymStreak,
    outboundStreak,
    yesterdayMood,
    hadMeetingYesterday,
  } = ctx

  if (yesterdayMood === 'DRAINED' || yesterdayMood === 'COOKED') return 'drained'
  if (behindOte) return 'pressure'
  if ((gymStreak ?? 0) >= 3 || (outboundStreak ?? 0) >= 5) return 'streak'
  if (hadMeetingYesterday) return 'milestone'
  return 'default'
}

export function pickQuoteForDay(category, dateStr) {
  const list = QUOTE_CATEGORIES[category] || QUOTE_CATEGORIES.default
  const i = dayHash(`${dateStr}|${category}`) % list.length
  return { ...list[i], category }
}
