import { idbRun } from '../storage/idb.ts'

const KEY_ID = 'draft-key'
let cached: Promise<CryptoKey | null> | null = null

/** A non-extractable AES key made once per browser and kept in IndexedDB; null if that is unavailable. */
export function deviceDraftKey(): Promise<CryptoKey | null> {
  cached ??= (async () => {
    const existing = await idbRun<CryptoKey>('readonly', (store) => store.get(KEY_ID))
    if (existing) return existing
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    const saved = await idbRun('readwrite', (store) => store.put(key, KEY_ID))
    return saved === null ? null : key
  })().catch(() => null)
  return cached
}
