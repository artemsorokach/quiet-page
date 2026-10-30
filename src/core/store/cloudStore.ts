import { deleteDoc, doc, onSnapshot, orderBy, query, setDoc, type Firestore } from 'firebase/firestore'
import { decryptJson, encryptJson } from '../crypto/dataKey.ts'
import { entriesRef } from '../firebase/userDoc.ts'
import type { SealedEntry } from '../keys/ports.ts'
import { newestFirst, type EntryStore, type JournalRecord, type Listener } from './types.ts'

/** Entries encrypted on the device with the data key and stored in Firestore. */
export class CloudEntryStore implements EntryStore {
  private records: JournalRecord[] = []
  private readonly listeners = new Set<Listener>()
  private readonly cache = new Map<string, { ct: string; record: JournalRecord }>()
  private stop: (() => void) | null = null
  private ready: Promise<void>

  constructor(
    private readonly db: Firestore,
    private readonly uid: string,
    private readonly key: CryptoKey,
    private readonly onError: (error: unknown) => void = () => undefined,
  ) {
    this.ready = new Promise((resolve) => {
      this.stop = onSnapshot(
        query(entriesRef(db, uid), orderBy('ts', 'desc')),
        (snap) => {
          void this.decryptAll(snap.docs.map((d) => ({ id: d.id, data: d.data() as SealedEntry }))).then(resolve)
        },
        (error) => {
          this.onError(error)
          resolve()
        },
      )
    })
  }

  private async decryptAll(items: { id: string; data: SealedEntry }[]): Promise<void> {
    const next: JournalRecord[] = []
    for (const { id, data } of items) {
      const cached = this.cache.get(id)
      if (cached && cached.ct === data.ct) {
        next.push(cached.record)
        continue
      }
      try {
        const body = await decryptJson<Omit<JournalRecord, 'id'>>(this.key, data)
        const record = { ...body, id } as JournalRecord
        this.cache.set(id, { ct: data.ct, record })
        next.push(record)
      } catch (error) {
        this.onError(error)
      }
    }
    this.records = newestFirst(next)
    this.listeners.forEach((listener) => listener(this.records))
  }

  async list(): Promise<readonly JournalRecord[]> {
    await this.ready
    return this.records
  }

  async put(record: JournalRecord): Promise<void> {
    const { id, ...body } = record
    const sealed = await encryptJson(this.key, body)
    const entry: SealedEntry = { ts: record.ts, v: 2, ...sealed }
    await setDoc(doc(entriesRef(this.db, this.uid), id), entry)
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(entriesRef(this.db, this.uid), id))
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.records)
    return () => {
      this.listeners.delete(listener)
    }
  }

  close(): void {
    this.stop?.()
    this.listeners.clear()
  }
}
