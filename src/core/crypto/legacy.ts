import { decryptJson } from './dataKey.ts'
import { deriveKey } from './envelope.ts'
import type { SealedJson } from './types.ts'

/** v1 scheme (before 2026-10-30): entries encrypted directly with a key from the password. */
const LEGACY_ITERATIONS = 310_000

export function legacyKeyFromPassword(password: string, saltBase64: string): Promise<CryptoKey> {
  return deriveKey(password, saltBase64, LEGACY_ITERATIONS)
}

export async function verifyLegacyPassword(check: SealedJson, key: CryptoKey): Promise<boolean> {
  try {
    const value = await decryptJson<{ app?: string }>(key, check)
    return value.app === 'quiet-page'
  } catch {
    return false
  }
}
