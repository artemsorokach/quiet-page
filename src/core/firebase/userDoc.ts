import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import type { Keyring } from '../crypto/types.ts'
import type { SealedEntry, UserDoc, UserDocPort } from '../keys/ports.ts'

const BATCH_LIMIT = 400

export const userRef = (db: Firestore, uid: string) => doc(db, 'users', uid)
export const entriesRef = (db: Firestore, uid: string) => collection(db, 'users', uid, 'entries')

/** users/{uid} in Firestore; rules allow access only to the signed-in owner. */
export class FirestoreUserDoc implements UserDocPort {
  constructor(
    private readonly db: Firestore,
    private readonly uid: string,
  ) {}

  async load(): Promise<UserDoc | null> {
    const snap = await getDoc(userRef(this.db, this.uid))
    return snap.exists() ? (snap.data() as UserDoc) : null
  }

  async loadFromServer(): Promise<UserDoc | null> {
    const snap = await getDocFromServer(userRef(this.db, this.uid))
    return snap.exists() ? (snap.data() as UserDoc) : null
  }

  async saveKeyring(keyring: Keyring): Promise<void> {
    await setDoc(userRef(this.db, this.uid), { keyring }, { merge: true })
  }

  async removeLegacyFields(): Promise<void> {
    await setDoc(userRef(this.db, this.uid), { salt: deleteField(), check: deleteField() }, { merge: true })
  }

  async rewriteEntries(transform: (entry: SealedEntry) => Promise<SealedEntry | null>): Promise<void> {
    const snap = await getDocs(entriesRef(this.db, this.uid))
    for (const item of snap.docs) {
      const next = await transform(item.data() as SealedEntry)
      if (next) await setDoc(item.ref, next)
    }
  }

  private async deleteEntries(): Promise<void> {
    const snap = await getDocs(entriesRef(this.db, this.uid))
    let batch = writeBatch(this.db)
    let count = 0
    for (const item of snap.docs) {
      batch.delete(item.ref)
      count += 1
      if (count % BATCH_LIMIT === 0) {
        await batch.commit()
        batch = writeBatch(this.db)
      }
    }
    await batch.commit()
  }

  async deleteEverything(): Promise<void> {
    await this.deleteEntries()
    await setDoc(userRef(this.db, this.uid), { keyring: deleteField(), salt: deleteField(), check: deleteField() }, { merge: true })
  }

  async deleteAccount(): Promise<void> {
    await this.deleteEntries()
    await deleteDoc(userRef(this.db, this.uid))
  }
}
