import { dayKey } from '../../core/journal/dates.ts'
import { isCheck } from '../../core/journal/records.ts'
import type { JournalRecord } from '../../core/store/types.ts'

export type Range = 'today' | '7' | '30' | 'all' | 'days'
export type Preset = 'all' | 'entries' | 'checks'

/** What the person unticked in the list. Everything is included by default. */
export interface Selection {
  excluded: ReadonlySet<string>
  /** entries sent without their text (only the mood and feelings) */
  noText: ReadonlySet<string>
  /** entries sent without their mood and feelings */
  noState: ReadonlySet<string>
}

export const EMPTY_SELECTION: Selection = { excluded: new Set(), noText: new Set(), noState: new Set() }
const DAY_MS = 86_400_000

export const hasState = (r: JournalRecord) => Boolean(r.mood) || (Array.isArray(r.feelings) && r.feelings.length > 0)

/** Records in the chosen period, newest first. */
export function inRange(records: readonly JournalRecord[], range: Range, days: ReadonlySet<string>, now: number): JournalRecord[] {
  const sorted = [...records].sort((a, b) => b.ts - a.ts)
  if (range === 'all') return sorted
  if (range === 'days') return sorted.filter((r) => days.has(dayKey(r.ts)))
  if (range === 'today') return sorted.filter((r) => dayKey(r.ts) === dayKey(now))
  const since = now - Number(range) * DAY_MS
  return sorted.filter((r) => r.ts >= since)
}

/** Days that have records, newest first, with how many. */
export function daysWithRecords(records: readonly JournalRecord[]): { key: string; ts: number; count: number }[] {
  const days = new Map<string, { key: string; ts: number; count: number }>()
  for (const r of [...records].sort((a, b) => b.ts - a.ts)) {
    const key = dayKey(r.ts)
    const day = days.get(key) ?? { key, ts: r.ts, count: 0 }
    days.set(key, { ...day, count: day.count + 1 })
  }
  return [...days.values()]
}

/** «Лише записи» / «Лише відмітки»: a starting selection for the list. */
export function presetSelection(list: readonly JournalRecord[], preset: Preset): Selection {
  if (preset === 'entries') return { ...EMPTY_SELECTION, excluded: new Set(list.filter(isCheck).map((r) => r.id)) }
  if (preset === 'checks') {
    const entries = list.filter((r) => !isCheck(r))
    return {
      excluded: new Set(entries.filter((r) => !hasState(r)).map((r) => r.id)),
      noText: new Set(entries.filter(hasState).map((r) => r.id)),
      noState: new Set(),
    }
  }
  return EMPTY_SELECTION
}

const toggled = (set: ReadonlySet<string>, id: string, on: boolean) => {
  const next = new Set(set)
  if (on) next.add(id)
  else next.delete(id)
  return next
}

/** Ticking or unticking a whole record. */
export function setIncluded(selection: Selection, id: string, included: boolean): Selection {
  if (included) return { excluded: toggled(selection.excluded, id, false), noText: toggled(selection.noText, id, false), noState: toggled(selection.noState, id, false) }
  return { ...selection, excluded: toggled(selection.excluded, id, true) }
}

/** Ticking the text or the mood part of an entry; with both off, the entry is left out. */
export function setPart(selection: Selection, record: JournalRecord, part: 'text' | 'state', on: boolean): Selection {
  const noText = part === 'text' ? toggled(selection.noText, record.id, !on) : selection.noText
  const noState = part === 'state' ? toggled(selection.noState, record.id, !on) : selection.noState
  const textOff = noText.has(record.id)
  const stateOff = noState.has(record.id) || !hasState(record)
  return { noText, noState, excluded: toggled(selection.excluded, record.id, textOff && stateOff) }
}

/** The records to send, shaped by what was unticked. */
export function picked(list: readonly JournalRecord[], selection: Selection): JournalRecord[] {
  return list
    .filter((r) => !selection.excluded.has(r.id))
    .map((r) => {
      if (isCheck(r)) return r
      if (selection.noText.has(r.id)) return { id: r.id, type: 'check', ts: r.ts, mood: r.mood, scale: r.scale, feelings: r.feelings } as JournalRecord
      if (selection.noState.has(r.id)) return { ...r, mood: null, feelings: [] }
      return r
    })
}
