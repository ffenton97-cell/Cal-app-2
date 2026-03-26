import { parseISO, format } from 'date-fns'

export function nextPaydays(anchorStr, intervalDays, count = 4) {
  const anchor = parseISO(`${anchorStr}T12:00:00`)
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  let d = new Date(anchor)
  const out = []
  let guard = 0
  while (guard++ < 500 && out.length < count) {
    if (d >= today) out.push(format(d, 'yyyy-MM-dd'))
    d = new Date(d)
    d.setDate(d.getDate() + intervalDays)
  }
  return out
}
