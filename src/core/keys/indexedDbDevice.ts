import type { DevicePort, DeviceRecord } from './ports.ts'

/** Same database and keys as the legacy site, so a device unlocked there stays unlocked. */
const DB_NAME = 'quiet-page'
const STORE = 'keys'
const recordKey = (uid: string) => `dev:${uid}`

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDb()
    .then(
      (db) =>
        new Promise<T | null>((resolve) => {
          const request = action(db.transaction(STORE, mode).objectStore(STORE))
          request.onsuccess = () => resolve((request.result as T | undefined) ?? null)
          request.onerror = () => resolve(null)
        }),
    )
    .catch(() => null)
}

/** IndexedDB can be unavailable (private mode); then the password is simply asked again. */
export const indexedDbDevice: DevicePort = {
  load: (uid) => run<DeviceRecord>('readonly', (store) => store.get(recordKey(uid))),
  save: async (uid, record) => {
    await run('readwrite', (store) => store.put(record, recordKey(uid)))
  },
  forget: async (uid) => {
    await run('readwrite', (store) => store.delete(recordKey(uid)))
    await run('readwrite', (store) => store.delete(`key:${uid}`))
  },
}
