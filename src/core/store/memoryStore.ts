import { newestFirst, type EntryStore, type JournalRecord, type Listener } from './types.ts'

/** Entries that live only while the page is open — used by the demo, nothing is saved. */
export class MemoryEntryStore implements EntryStore {
  private records: JournalRecord[]
  private readonly listeners = new Set<Listener>()

  constructor(initial: readonly JournalRecord[] = []) {
    this.records = newestFirst(initial)
  }

  private set(next: readonly JournalRecord[]) {
    this.records = newestFirst(next)
    this.listeners.forEach((listener) => listener(this.records))
  }

  async list() {
    return this.records
  }

  async put(record: JournalRecord) {
    this.set([...this.records.filter((r) => r.id !== record.id), record])
  }

  async remove(id: string) {
    this.set(this.records.filter((r) => r.id !== id))
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener(this.records)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
