import { decodeBase64, encodeBase64, randomBytes } from '../crypto/base64.ts'

/** What is on «Сторінка» before «Зберегти»: kept on this device only, encrypted. */
export interface Draft {
  mood: number | null
  feelings: string[]
  answer: string
  free: string
  /** index of the question being answered; null when the question is hidden */
  question: number | null
}

export const EMPTY_DRAFT: Draft = { mood: null, feelings: [], answer: '', free: '', question: null }

export const isEmptyDraft = (d: Draft) => d.mood === null && d.feelings.length === 0 && !d.answer.trim() && !d.free.trim()

/** Accepts only a well-formed draft (it comes back from storage). */
export function parseDraft(value: unknown): Draft | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const mood = typeof v.mood === 'number' && v.mood >= 1 && v.mood <= 5 ? v.mood : null
  const feelings = Array.isArray(v.feelings) ? v.feelings.filter((f): f is string => typeof f === 'string').slice(0, 60) : []
  const text = (x: unknown) => (typeof x === 'string' ? x : '')
  const question = typeof v.question === 'number' && Number.isInteger(v.question) && v.question >= 0 ? v.question : null
  return { mood, feelings, answer: text(v.answer), free: text(v.free), question }
}

type KeyValue = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface DraftStore {
  load(scope: string): Promise<Draft | null>
  save(scope: string, draft: Draft): Promise<void>
  clear(scope: string): Promise<void>
}

const storageKey = (scope: string) => `qp-draft:${scope}`
const IV_BYTES = 12

/**
 * Drafts are sealed with AES-GCM using a key that never leaves this device (non-extractable,
 * kept in IndexedDB), so the text does not sit in the browser as plain text.
 */
export function createDraftStore(getKey: () => Promise<CryptoKey | null>, storage: KeyValue): DraftStore {
  return {
    async load(scope) {
      const raw = storage.getItem(storageKey(scope))
      const key = raw ? await getKey() : null
      if (!raw || !key) return null
      try {
        const { iv, ct } = JSON.parse(raw) as { iv: string; ct: string }
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64(iv) }, key, decodeBase64(ct))
        return parseDraft(JSON.parse(new TextDecoder().decode(plain)))
      } catch {
        return null
      }
    },
    async save(scope, draft) {
      if (isEmptyDraft(draft)) return this.clear(scope)
      const key = await getKey()
      if (!key) return
      const iv = randomBytes(IV_BYTES)
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(draft)))
      try {
        storage.setItem(storageKey(scope), JSON.stringify({ iv: encodeBase64(iv), ct: encodeBase64(ct) }))
      } catch {
        // storage full or blocked: the draft is simply not kept
      }
    },
    async clear(scope) {
      try {
        storage.removeItem(storageKey(scope))
      } catch {
        // nothing to clear
      }
    },
  }
}
