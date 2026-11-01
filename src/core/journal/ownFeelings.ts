import type { JournalRecord } from '../store/types.ts'
import { FEELING_KEYS, isFeelingKey, normalizeFeeling } from './feelings.ts'

const MAX_LENGTH = 40

/**
 * A word the person typed: the key when it is one of the listed feelings (in the current
 * language or Ukrainian), otherwise the word itself, tidied. Empty string when nothing was typed.
 */
export function ownWordValue(word: string, labels: readonly string[], ukLabels: readonly string[]): string {
  const clean = word.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH)
  if (!clean) return ''
  const lower = clean.toLocaleLowerCase()
  const index = labels.findIndex((l) => l.toLocaleLowerCase() === lower)
  if (index >= 0) return FEELING_KEYS[index] ?? clean
  const known = normalizeFeeling(lower, ukLabels)
  return isFeelingKey(known) ? known : clean
}

/** The person's own words: saved ones, ones used in records and ones chosen now, minus hidden ones. */
export function ownWords(
  saved: readonly string[],
  hidden: readonly string[],
  records: readonly JournalRecord[],
  selected: readonly string[],
  ukLabels: readonly string[],
): string[] {
  const out: string[] = []
  const push = (w: unknown) => {
    if (typeof w !== 'string' || !w || isFeelingKey(normalizeFeeling(w, ukLabels)) || hidden.includes(w) || out.includes(w)) return
    out.push(w)
  }
  saved.forEach(push)
  records.forEach((r) => (Array.isArray(r.feelings) ? r.feelings : []).forEach(push))
  selected.forEach(push)
  return out
}
