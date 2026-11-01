import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EMPTY_DRAFT, createDraftStore, isEmptyDraft, parseDraft } from './draft.ts'

function memory() {
  const map = new Map<string, string>()
  return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) }
}
const key = () => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])

test('a draft is stored encrypted and comes back the same', async () => {
  const storage = memory()
  const k = await key()
  const store = createDraftStore(async () => k, storage)
  const draft = { mood: 3, feelings: ['calm', 'своє слово'], answer: 'Відповідь', free: 'Таємний текст', question: 7 }
  await store.save('local', draft)
  const raw = storage.map.get('qp-draft:local') ?? ''
  assert.ok(raw && !raw.includes('Таємний'), 'no plain text in storage')
  assert.deepEqual(await store.load('local'), draft)
})

test('drafts are kept per account and an empty draft clears it', async () => {
  const storage = memory()
  const k = await key()
  const store = createDraftStore(async () => k, storage)
  await store.save('u1', { ...EMPTY_DRAFT, free: 'a' })
  assert.equal(await store.load('u2'), null)
  await store.save('u1', EMPTY_DRAFT)
  assert.equal(storage.map.size, 0)
})

test('without a device key nothing is written and nothing is read', async () => {
  const storage = memory()
  const store = createDraftStore(async () => null, storage)
  await store.save('local', { ...EMPTY_DRAFT, free: 'a' })
  assert.equal(storage.map.size, 0)
  assert.equal(await store.load('local'), null)
})

test('another key cannot open the draft', async () => {
  const storage = memory()
  await createDraftStore(key, storage).save('local', { ...EMPTY_DRAFT, free: 'a' })
  assert.equal(await createDraftStore(key, storage).load('local'), null)
})

test('parseDraft keeps only valid fields', () => {
  assert.deepEqual(parseDraft({ mood: 9, feelings: ['calm', 3], answer: 1, free: 'x', question: -1 }), { mood: null, feelings: ['calm'], answer: '', free: 'x', question: null })
  assert.equal(parseDraft('nope'), null)
  assert.ok(isEmptyDraft({ ...EMPTY_DRAFT, free: '   ' }))
})
