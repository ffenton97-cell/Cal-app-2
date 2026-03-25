/**
 * @typedef {{ id: string, title: string, month: number, day: number, year: number | null, notes?: string, created: string }} ImportantDateRow
 */

/**
 * Next calendar date (yyyy-MM-dd) for an annual month/day, on or after `fromYmd`.
 */
export function nextAnnualOccurrence(month, day, fromYmd) {
  const y = parseInt(fromYmd.slice(0, 4), 10)
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  let candidate = `${y}-${mm}-${dd}`
  if (candidate < fromYmd) {
    candidate = `${y + 1}-${mm}-${dd}`
  }
  return candidate
}

/**
 * Map DB row → timeline fields for Datebook.
 * @param {ImportantDateRow} row
 * @param {string} todayStr
 * @param {string} oneOffHorizonYmd — hide one-off dates farther out than this (e.g. +365d)
 */
export function importantDateToTimelineItem(row, todayStr, oneOffHorizonYmd) {
  const { month, day, year, title, notes, id } = row
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')

  if (year != null) {
    const d = `${year}-${mm}-${dd}`
    const overdue = d < todayStr
    const tooFarFuture = !overdue && d > oneOffHorizonYmd
    if (tooFarFuture) return null
    return {
      sort: d,
      date: d,
      kind: 'personal',
      title,
      sub: notes || 'One-time',
      id: `imp-${id}`,
      overdue,
      personalId: id,
    }
  }

  const next = nextAnnualOccurrence(month, day, todayStr)
  return {
    sort: next,
    date: next,
    kind: 'personal',
    title,
    sub: notes || 'Every year',
    id: `imp-${id}`,
    overdue: false,
    personalId: id,
  }
}

export function uid(prefix = 'imp') {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`
}
