import type { JournalRecord } from '../store/types.ts'

/** Settings that travel with a backup (same keys as the legacy site). */
export const BACKUP_SETTING_KEYS = ['ts-pal', 'ts-mode', 'ts-atmo', 'ts-wfont', 'ts-scale', 'ts-lang', 'ts-myfeels', 'ts-merge', 'ts-focus'] as const

export interface Backup {
  app: 'quiet-page'
  version: 1
  exportedAt: string
  entries: JournalRecord[]
  settings: Record<string, unknown>
}

export function makeBackup(entries: readonly JournalRecord[], settings: Record<string, unknown>, now: Date): string {
  const backup: Backup = { app: 'quiet-page', version: 1, exportedAt: now.toISOString(), entries: [...entries], settings }
  return JSON.stringify(backup, null, 1)
}

const isRecord = (value: unknown): value is JournalRecord => {
  if (!value || typeof value !== 'object') return false
  const r = value as { id?: unknown; ts?: unknown }
  return typeof r.id === 'string' && r.id.length > 0 && typeof r.ts === 'number' && Number.isFinite(r.ts)
}

/** Accepts a backup file or a bare array of entries; throws on anything else. */
export function parseBackup(text: string): { entries: JournalRecord[]; settings: Record<string, unknown> } {
  const data: unknown = JSON.parse(text)
  const list = Array.isArray(data) ? data : (data as { entries?: unknown } | null)?.entries
  if (!Array.isArray(list)) throw new Error('not-a-backup')
  const settings = !Array.isArray(data) && data && typeof (data as { settings?: unknown }).settings === 'object'
    ? ((data as { settings: Record<string, unknown> }).settings ?? {})
    : {}
  return { entries: list.filter(isRecord), settings }
}

/** Records from the backup that are not there yet (matched by id). */
export function newRecords(existing: readonly JournalRecord[], incoming: readonly JournalRecord[]): JournalRecord[] {
  const have = new Set(existing.map((r) => r.id))
  return incoming.filter((r) => !have.has(r.id))
}
