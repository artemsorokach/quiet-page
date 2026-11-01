import type { JournalRecord } from '../store/types.ts'
import { additionsOf } from './records.ts'
import { dayKey } from './dates.ts'

const DAY_MS = 864e5
/** How long an addition counts as «нещодавно». */
export const RECENT_DAYS = 7
/** At most this many entries in «Нещодавно доповнено». */
const MAX_SHOWN = 3

export interface RecentAddition {
  record: JournalRecord
  at: number
  text: string
}

/**
 * Entries one came back to and added to in the last week, newest first. An addition on the day
 * the entry was written is part of that day, not a return to it, so it is left out.
 */
export function recentlyAdded(records: readonly JournalRecord[], now: number): RecentAddition[] {
  const since = now - RECENT_DAYS * DAY_MS
  const found: RecentAddition[] = []
  for (const record of records) {
    const later = additionsOf(record).filter((a) => a.at >= since && dayKey(a.at) !== dayKey(record.ts))
    const last = later.reduce<(typeof later)[number] | null>((best, a) => (!best || a.at > best.at ? a : best), null)
    if (last) found.push({ record, at: last.at, text: last.text })
  }
  return found.sort((a, b) => b.at - a.at).slice(0, MAX_SHOWN)
}
