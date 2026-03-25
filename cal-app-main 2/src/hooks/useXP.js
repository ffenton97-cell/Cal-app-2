import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../db'
import { getLevelInfo, ACHIEVEMENTS } from '../theme'

const XP_ID = 'singleton'

async function getXPRecord() {
  let record = await db.xp.get(XP_ID)
  if (!record) {
    record = { id: XP_ID, totalXp: 0, earnedToday: 0, earnedAchievements: [], lastUpdated: null }
    await db.xp.put(record)
  }
  return record
}

export function useXP() {
  // Never write inside useLiveQuery — it retriggers subscriptions and can throw DexieError.
  const row = useLiveQuery(() => db.xp.get(XP_ID), [])
  const totalXp = row?.totalXp ?? 0
  const earnedToday = row?.earnedToday ?? 0
  const earnedAchievements = row?.earnedAchievements ?? []
  const lastUpdated = row?.lastUpdated ?? null
  const levelInfo = getLevelInfo(totalXp)
  return { totalXp, earnedToday, earnedAchievements, lastUpdated, levelInfo }
}

/**
 * Award XP points. Returns { newTotal, leveledUp, unlockedAchievements }.
 */
export async function awardXP(amount, stats = {}) {
  const record = await getXPRecord()
  const today  = format(new Date(), 'yyyy-MM-dd')

  // Reset earnedToday if it's a new day
  const earnedToday = record.lastUpdated === today
    ? (record.earnedToday ?? 0) + amount
    : amount

  const prevTotal = record.totalXp ?? 0
  const newTotal  = prevTotal + amount

  // Check achievements
  const earned = record.earnedAchievements ?? []
  const newlyUnlocked = ACHIEVEMENTS.filter(
    (a) => !earned.includes(a.id) && a.test(stats)
  )
  const bonusXp = newlyUnlocked.reduce((sum, a) => sum + a.xp, 0)
  const finalTotal = newTotal + bonusXp

  await db.xp.put({
    id: XP_ID,
    totalXp: finalTotal,
    earnedToday,
    earnedAchievements: [...earned, ...newlyUnlocked.map((a) => a.id)],
    lastUpdated: today,
  })

  const prevLevel = getLevelInfo(prevTotal).current.level
  const nextLevel = getLevelInfo(finalTotal).current.level

  return {
    newTotal: finalTotal,
    leveledUp: nextLevel > prevLevel,
    unlockedAchievements: newlyUnlocked,
  }
}
