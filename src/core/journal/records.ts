import type { JournalRecord, QuestionAnswer } from '../store/types.ts'
import { normalizeFeeling } from './feelings.ts'

export interface Addition {
  /** when it was added, ms */
  at: number
  text: string
}

/** One earlier version of an entry's text, kept when the entry is edited. */
export interface HistoryStep {
  at: number
  qa: readonly QuestionAnswer[]
  additions: readonly Addition[]
}

export const SCALE_IDS = ['vaha', 'voda', 'teplo', 'zvuk', 'tilo', 'syly'] as const
export type ScaleId = (typeof SCALE_IDS)[number]
export const isScaleId = (value: unknown): value is ScaleId => (SCALE_IDS as readonly unknown[]).includes(value)

/** Locale shape of a scale: [name, [five words]] */
export type ScaleText = readonly [string, readonly string[]]
export type Scales = Readonly<Record<string, ScaleText>>

export const isCheck = (record: JournalRecord): boolean => record.type === 'check'

export function qaOf(record: JournalRecord): readonly QuestionAnswer[] {
  if (isCheck(record)) return []
  const qa = (record as { qa?: unknown }).qa
  if (Array.isArray(qa) && qa.length) return qa as QuestionAnswer[]
  const legacy = record as { prompt?: string | null; text?: string }
  return [{ prompt: legacy.prompt ?? null, text: legacy.text ?? '' }]
}

export function additionsOf(record: JournalRecord): readonly Addition[] {
  const value = (record as { additions?: unknown }).additions
  return Array.isArray(value) ? (value as Addition[]) : []
}

export function historyOf(record: JournalRecord): readonly HistoryStep[] {
  const value = (record as { history?: unknown }).history
  return Array.isArray(value) ? (value as HistoryStep[]) : []
}

export function feelingsOf(record: JournalRecord, ukLabels: readonly string[]): string[] {
  return Array.isArray(record.feelings) ? record.feelings.map((f) => normalizeFeeling(f, ukLabels)) : []
}

export interface MoodTag {
  value: number
  word: string
}

export function moodOf(record: JournalRecord, scales: Scales, fallback: string): MoodTag | null {
  const value = record.mood
  if (!value || value < 1 || value > 5) return null
  const scale = scales[isScaleId(record.scale) ? record.scale : fallback] ?? scales.vaha
  return { value, word: scale?.[1][value - 1] ?? String(value) }
}

/** Colour between the palette's low and high colours, as on the legacy site. */
export const moodColor = (value: number) => `color-mix(in oklab, var(--lo), var(--hi) ${Math.round((value - 1) * 25)}%)`

/** Fixed colours for exported pages, which do not know the palette. */
export const EXPORT_MOOD = ['#4a6890', '#56849c', '#63a1a9', '#7fc4bc', '#a3e6cf'] as const

/** Text of an entry after editing: empty answers dropped, the previous version kept in history. */
export function applyEdit(
  record: JournalRecord,
  qa: readonly QuestionAnswer[],
  additions: readonly Addition[],
  now: number,
): JournalRecord {
  const kept = qa.filter((item) => item.text)
  return {
    ...record,
    qa: kept.length ? kept : [{ prompt: null, text: '' }],
    text: kept.map((item) => item.text).join('\n\n'),
    prompt: kept[0]?.prompt ?? null,
    additions: additions.filter((a) => a.text),
    editedAt: now,
    history: [...historyOf(record), { at: now, qa: qaOf(record), additions: additionsOf(record) }],
  } as JournalRecord
}

export function applyAddition(record: JournalRecord, text: string, now: number): JournalRecord {
  return { ...record, additions: [...additionsOf(record), { at: now, text }] } as JournalRecord
}
