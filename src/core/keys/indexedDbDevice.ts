import { idbRun } from '../storage/idb.ts'
import type { DevicePort, DeviceRecord } from './ports.ts'

/** Same database and keys as the legacy site, so a device unlocked there stays unlocked. */
const recordKey = (uid: string) => `dev:${uid}`

/** IndexedDB can be unavailable (private mode); then the password is simply asked again. */
export const indexedDbDevice: DevicePort = {
  load: (uid) => idbRun<DeviceRecord>('readonly', (store) => store.get(recordKey(uid))),
  save: async (uid, record) => {
    await idbRun('readwrite', (store) => store.put(record, recordKey(uid)))
  },
  forget: async (uid) => {
    await idbRun('readwrite', (store) => store.delete(recordKey(uid)))
    await idbRun('readwrite', (store) => store.delete(`key:${uid}`))
  },
}
