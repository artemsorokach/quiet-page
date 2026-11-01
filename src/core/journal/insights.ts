import type { JournalRecord } from '../store/types.ts'
import { UK_FEELINGS } from '../i18n/ukFeelings.ts'
import { dayKey } from './dates.ts'
import { additionsOf, feelingsOf, isCheck, qaOf } from './records.ts'

/*
 * Quiet observations over one's own records. Everything here runs on the device, after
 * decryption; nothing is scored, ranked or sent anywhere.
 */

/** «Рік тому сьогодні»: an entry from this date last year (written text preferred over a mood note). */
export function onThisDayYearAgo(records: readonly JournalRecord[], now: number): JournalRecord | null {
  const today = new Date(now)
  const target = dayKey(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()))
  const sameDay = records.filter((r) => dayKey(r.ts) === target)
  return sameDay.find((r) => !isCheck(r)) ?? sameDay[0] ?? null
}

/** How many days of the month had each mood (index 0 = mood 1). A day counts once, by its average mood. */
export function daysByMood(records: readonly JournalRecord[], year: number, monthIndex: number): number[] {
  const byDay = new Map<string, number[]>()
  for (const r of records) {
    const d = new Date(r.ts)
    if (d.getFullYear() !== year || d.getMonth() !== monthIndex) continue
    if (typeof r.mood !== 'number' || r.mood < 1 || r.mood > 5) continue
    byDay.set(dayKey(r.ts), [...(byDay.get(dayKey(r.ts)) ?? []), r.mood])
  }
  const counts = [0, 0, 0, 0, 0]
  for (const moods of byDay.values()) {
    const average = Math.round(moods.reduce((a, b) => a + b, 0) / moods.length)
    counts[average - 1] = (counts[average - 1] ?? 0) + 1
  }
  return counts
}

/** Feelings named most often (each record counts once per feeling). */
export function topFeelings(records: readonly JournalRecord[], limit: number): [string, number][] {
  const counts = new Map<string, number>()
  for (const r of records) for (const f of new Set(feelingsOf(r, UK_FEELINGS))) counts.set(f, (counts.get(f) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
}

/** «Що наповнює, а що забирає сили»: written entries from full days (4–5) and drained days (1–2). */
export function moodSides(records: readonly JournalRecord[], limit: number): { full: JournalRecord[]; drained: JournalRecord[] } {
  const written = [...records].filter((r) => !isCheck(r) && typeof r.mood === 'number').sort((a, b) => b.ts - a.ts)
  return {
    full: written.filter((r) => (r.mood ?? 0) >= 4).slice(0, limit),
    drained: written.filter((r) => (r.mood ?? 9) <= 2).slice(0, limit),
  }
}

/** All the words of a record, for search. */
export function searchableText(record: JournalRecord): string {
  const parts = [...qaOf(record).map((q) => q.text), ...additionsOf(record).map((a) => a.text)]
  return parts.join('\n').toLocaleLowerCase()
}

/** Search: every word of the query appears somewhere, and every chosen feeling is on the record. */
export function matches(record: JournalRecord, query: string, feelings: readonly string[]): boolean {
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const text = words.length ? searchableText(record) : ''
  if (!words.every((w) => text.includes(w))) return false
  const own = feelingsOf(record, UK_FEELINGS)
  return feelings.every((f) => own.includes(f))
}

/** «Важливе»: a bookmark the person set on an entry. */
export const isImportant = (record: JournalRecord): boolean => (record as { important?: unknown }).important === true
