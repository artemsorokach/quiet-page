import { onStateChange, readState, tick, writeState } from './state.ts'

export interface Firestore {
  kind: 'db'
}
export interface DocumentReference {
  kind: 'doc'
  path: string
  id: string
}
export interface CollectionReference {
  kind: 'col'
  path: string
}
export interface Query {
  kind: 'query'
  path: string
  field: string
  dir: 'asc' | 'desc'
}
interface Snapshot {
  id: string
  ref: DocumentReference
  exists: () => boolean
  data: () => Record<string, unknown> | undefined
}

const DELETE = '__fake_delete__'
const offline = () => Object.assign(new Error('unavailable'), { code: 'unavailable' })

export const initializeFirestore = (_app: unknown, _settings: unknown): Firestore => ({ kind: 'db' })
export const persistentLocalCache = (_settings: unknown) => ({})
export const persistentMultipleTabManager = () => ({})
export const deleteField = () => DELETE

const join = (parts: string[]) => parts.join('/')
const toDoc = (path: string): DocumentReference => ({ kind: 'doc', path, id: path.split('/').pop() ?? '' })

export function doc(parent: Firestore | CollectionReference, ...segments: string[]): DocumentReference {
  return parent.kind === 'col' ? toDoc(join([parent.path, ...segments])) : toDoc(join(segments))
}

export function collection(_db: Firestore, ...segments: string[]): CollectionReference {
  return { kind: 'col', path: join(segments) }
}

export const orderBy = (field: string, dir: 'asc' | 'desc' = 'asc') => ({ field, dir })
export const query = (col: CollectionReference, order: { field: string; dir: 'asc' | 'desc' }): Query => ({
  kind: 'query',
  path: col.path,
  ...order,
})

function snapshot(path: string): Snapshot {
  const data = readState().docs[path]
  return { id: toDoc(path).id, ref: toDoc(path), exists: () => data !== undefined, data: () => (data ? structuredClone(data) : undefined) }
}

function children(path: string): Snapshot[] {
  const prefix = `${path}/`
  return Object.keys(readState().docs)
    .filter((key) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
    .map(snapshot)
}

export async function getDoc(ref: DocumentReference): Promise<Snapshot> {
  await tick()
  if (readState().offline) throw offline()
  return snapshot(ref.path)
}
export const getDocFromServer = getDoc

export async function getDocs(col: CollectionReference): Promise<{ docs: Snapshot[] }> {
  await tick()
  if (readState().offline) throw offline()
  return { docs: children(col.path) }
}

function write(path: string, data: Record<string, unknown> | null, merge = false): void {
  const state = readState()
  const docs = { ...state.docs }
  if (data === null) delete docs[path]
  else {
    const next: Record<string, unknown> = merge ? { ...(docs[path] ?? {}) } : {}
    for (const [key, value] of Object.entries(data)) {
      if (value === DELETE) delete next[key]
      else next[key] = structuredClone(value)
    }
    docs[path] = next
  }
  writeState({ ...state, docs })
}

export async function setDoc(ref: DocumentReference, data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void> {
  await tick()
  if (readState().offline) throw offline()
  write(ref.path, data, options?.merge)
}

export async function deleteDoc(ref: DocumentReference): Promise<void> {
  await tick()
  write(ref.path, null)
}

export function writeBatch(_db: Firestore) {
  const removals: string[] = []
  return {
    delete: (ref: DocumentReference) => void removals.push(ref.path),
    commit: async () => {
      await tick()
      removals.forEach((path) => write(path, null))
    },
  }
}

export function onSnapshot(
  q: Query,
  next: (snap: { docs: Snapshot[] }) => void,
  _error?: (error: unknown) => void,
): () => void {
  let last = ''
  const emit = () => {
    const docs = children(q.path).sort((a, b) => {
      const av = Number(a.data()?.[q.field] ?? 0)
      const bv = Number(b.data()?.[q.field] ?? 0)
      return q.dir === 'desc' ? bv - av : av - bv
    })
    const signature = JSON.stringify(docs.map((d) => [d.id, d.data()]))
    if (signature === last) return
    last = signature
    next({ docs })
  }
  void tick().then(emit)
  return onStateChange(() => void tick().then(emit))
}
