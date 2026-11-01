import type { Keyring, SealedJson } from '../crypto/types.ts'

/** users/{uid} as stored in Firestore */
export interface UserDoc {
  keyring?: Keyring
  /** v1 legacy fields (password-derived key), removed after migration */
  salt?: string
  check?: SealedJson
}

/** An encrypted entry document: users/{uid}/entries/{id} */
export interface SealedEntry extends SealedJson {
  ts: number
  v?: number
}

/** Access to the person's own documents. Implemented with Firestore; in tests, in memory. */
export interface UserDocPort {
  /** Throws when the document cannot be read (offline and not cached). */
  load(): Promise<UserDoc | null>
  /** Reads past any local cache; used before creating a new keyring. */
  loadFromServer(): Promise<UserDoc | null>
  saveKeyring(keyring: Keyring): Promise<void>
  removeLegacyFields(): Promise<void>
  /** Rewrites every entry; `transform` returns the new sealed entry or null to keep it as is. */
  rewriteEntries(transform: (entry: SealedEntry) => Promise<SealedEntry | null>): Promise<void>
  /** Deletes all entries and the keyring ("start with a clean page"). */
  deleteEverything(): Promise<void>
  /** Deletes all entries and the user document itself (account deletion). */
  deleteAccount(): Promise<void>
}

/** What this device remembers so the password is asked only once (IndexedDB in the browser). */
export interface DeviceRecord {
  /** keyring.kid this record belongs to */
  kid: string | null
  /** non-extractable data key */
  dek: CryptoKey
  /** non-extractable device key wrapping a copy of the raw data key */
  devKey: CryptoKey
  iv: string
  ct: string
}

export interface DevicePort {
  load(uid: string): Promise<DeviceRecord | null>
  save(uid: string, record: DeviceRecord): Promise<void>
  forget(uid: string): Promise<void>
}
