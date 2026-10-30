import { decodeBase64, encodeBase64, randomBytes } from './base64.ts'
import { WrongSecretError } from './errors.ts'
import type { Envelope, KdfOptions } from './types.ts'

export const DEFAULT_ITERATIONS = 600_000
const SALT_BYTES = 16
const IV_BYTES = 12

export async function deriveKey(secret: string, saltBase64: string, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: decodeBase64(saltBase64), iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Wraps raw key bytes with a key derived from `secret`. */
export async function sealEnvelope(raw: Uint8Array<ArrayBuffer>, secret: string, options: KdfOptions = {}): Promise<Envelope> {
  const iter = options.iterations ?? DEFAULT_ITERATIONS
  const salt = encodeBase64(randomBytes(SALT_BYTES))
  const iv = randomBytes(IV_BYTES)
  const key = await deriveKey(secret, salt, iter)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, raw)
  return { salt, iter, iv: encodeBase64(iv), ct: encodeBase64(ct) }
}

/** Returns the raw key bytes, or throws WrongSecretError. */
export async function openEnvelope(envelope: Envelope, secret: string): Promise<Uint8Array<ArrayBuffer>> {
  const key = await deriveKey(secret, envelope.salt, envelope.iter || DEFAULT_ITERATIONS)
  try {
    const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64(envelope.iv) }, key, decodeBase64(envelope.ct))
    return new Uint8Array(raw)
  } catch {
    throw new WrongSecretError()
  }
}
