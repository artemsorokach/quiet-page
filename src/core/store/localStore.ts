import { newestFirst, type EntryStore, type JournalRecord, type Listener } from './types.ts'

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

/** Same key as the legacy site, so entries written there show up here. */
export const LOCAL_KEY = 'ts-entries'

function isRecord(value: unknown): value is JournalRecord {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { id?: unknown; ts?: unknown }
  return typeof candidate.id === 'string' && typeof candidate.ts === 'number'
}

/** Entries kept only in this browser (not encrypted). Used before the person signs in. */
export class LocalEntryStore implements EntryStore {
  private readonly listeners = new Set<Listener>()

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string = LOCAL_KEY,
  ) {}

  private read(): JournalRecord[] {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(this.key) ?? '[]')
      return Array.isArray(parsed) ? newestFirst(parsed.filter(isRecord)) : []
    } catch {
      return []
    }
  }

  private write(records: readonly JournalRecord[]): void {
    const sorted = newestFirst(records)
    this.storage.setItem(this.key, JSON.stringify(sorted))
    this.listeners.forEach((listener) => listener(sorted))
  }

  async list(): Promise<readonly JournalRecord[]> {
    return this.read()
  }

  async put(record: JournalRecord): Promise<void> {
    this.write([...this.read().filter((r) => r.id !== record.id), record])
  }

  async remove(id: string): Promise<void> {
    this.write(this.read().filter((r) => r.id !== id))
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.read())
    return () => {
      this.listeners.delete(listener)
    }
  }
}
