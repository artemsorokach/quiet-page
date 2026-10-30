import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LocalEntryStore, type KeyValueStorage } from './localStore.ts'
import type { EntryRecord } from './types.ts'

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => (key in data ? (data[key] ?? null) : null),
    setItem: (key, value) => {
      data[key] = value
    },
  }
}

const entry = (id: string, ts: number): EntryRecord => ({ id, ts, qa: [{ prompt: null, text: id }], text: id })

test('reads entries saved by the legacy site under ts-entries, newest first', async () => {
  const storage = memoryStorage({ 'ts-entries': JSON.stringify([entry('a', 1), entry('b', 3), entry('c', 2)]) })
  const store = new LocalEntryStore(storage)
  assert.deepEqual((await store.list()).map((r) => r.id), ['b', 'c', 'a'])
})

test('put adds or replaces by id and persists', async () => {
  const storage = memoryStorage()
  const store = new LocalEntryStore(storage)
  await store.put(entry('a', 1))
  await store.put({ ...entry('a', 1), text: 'changed' })
  await store.put(entry('b', 2))
  const saved = JSON.parse(storage.data['ts-entries'] ?? '[]') as EntryRecord[]
  assert.deepEqual(saved.map((r) => [r.id, r.text]), [['b', 'b'], ['a', 'changed']])
})

test('remove deletes by id', async () => {
  const store = new LocalEntryStore(memoryStorage())
  await store.put(entry('a', 1))
  await store.remove('a')
  assert.deepEqual(await store.list(), [])
})

test('subscribers get the list right away and after each change', async () => {
  const store = new LocalEntryStore(memoryStorage())
  const seen: number[] = []
  const stop = store.subscribe((records) => seen.push(records.length))
  await store.put(entry('a', 1))
  stop()
  await store.put(entry('b', 2))
  assert.deepEqual(seen, [0, 1])
})

test('broken stored data is treated as empty instead of crashing', async () => {
  const store = new LocalEntryStore(memoryStorage({ 'ts-entries': '{not json' }))
  assert.deepEqual(await store.list(), [])
})
