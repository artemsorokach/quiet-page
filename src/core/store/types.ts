/** Shapes match what the legacy site stores, so old entries keep working. */

export interface QuestionAnswer {
  /** null for free text */
  prompt: string | null
  /** index of the prompt in the language's prompt list, when it came from there */
  qi?: number
  text: string
}

interface RecordBase {
  id: string
  /** creation time, ms since epoch */
  ts: number
  mood?: number | null
  scale?: string
  feelings?: readonly string[]
}

export interface EntryRecord extends RecordBase {
  type?: undefined
  qa: readonly QuestionAnswer[]
  text: string
  prompt?: string | null
  lang?: string
  [extra: string]: unknown
}

/** A mood note without text */
export interface CheckRecord extends RecordBase {
  type: 'check'
}

export type JournalRecord = EntryRecord | CheckRecord

export type Listener = (records: readonly JournalRecord[]) => void

/** Where entries live: this browser, or the encrypted cloud. Screens only see this interface. */
export interface EntryStore {
  list(): Promise<readonly JournalRecord[]>
  put(record: JournalRecord): Promise<void>
  remove(id: string): Promise<void>
  /** Calls the listener right away and after every change; returns a function that stops it. */
  subscribe(listener: Listener): () => void
}

export function newestFirst(records: readonly JournalRecord[]): JournalRecord[] {
  return [...records].sort((a, b) => b.ts - a.ts)
}
