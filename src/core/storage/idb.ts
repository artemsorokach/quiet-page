/** The legacy site's IndexedDB database: `quiet-page`, one object store `keys`. */
const DB_NAME = 'quiet-page'
const STORE = 'keys'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Runs one request; resolves null when IndexedDB is unavailable (private mode) or fails. */
export function idbRun<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
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
