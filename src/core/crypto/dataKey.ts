import { decodeBase64, encodeBase64, randomBytes } from './base64.ts'
import type { SealedJson } from './types.ts'

const DATA_KEY_BYTES = 32
const IV_BYTES = 12

export function generateRawDataKey(): Uint8Array<ArrayBuffer> {
  return randomBytes(DATA_KEY_BYTES)
}

/** Imports the data key as a non-extractable AES-GCM key. */
export function importDataKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<SealedJson> {
  const iv = randomBytes(IV_BYTES)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value)))
  return { iv: encodeBase64(iv), ct: encodeBase64(ct) }
}

/** Throws if the key does not match or the data was altered. */
export async function decryptJson<T = unknown>(key: CryptoKey, sealed: SealedJson): Promise<T> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64(sealed.iv) }, key, decodeBase64(sealed.ct))
  return JSON.parse(new TextDecoder().decode(plain)) as T
}
