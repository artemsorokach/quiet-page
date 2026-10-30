import { encodeBase64, randomBytes } from './base64.ts'
import { generateRawDataKey } from './dataKey.ts'
import { openEnvelope, sealEnvelope } from './envelope.ts'
import { WrongSecretError } from './errors.ts'
import { generateRecoveryCode, isCompleteRecoveryCode, normalizeRecoveryCode } from './recoveryCode.ts'
import type { KdfOptions, Keyring } from './types.ts'

export { WrongSecretError }

const KID_BYTES = 9

export interface NewKeyring {
  keyring: Keyring
  rawKey: Uint8Array<ArrayBuffer>
  /** Shown to the person once, formatted as XXXX-XXXX-… */
  recoveryCode: string
}

export async function createKeyring(password: string, options: KdfOptions = {}): Promise<NewKeyring> {
  const rawKey = generateRawDataKey()
  const recoveryCode = generateRecoveryCode()
  const keyring: Keyring = {
    v: 2,
    kid: encodeBase64(randomBytes(KID_BYTES)),
    pw: await sealEnvelope(rawKey, password, options),
    rc: await sealEnvelope(rawKey, normalizeRecoveryCode(recoveryCode), options),
  }
  return { keyring, rawKey, recoveryCode }
}

export function unlockWithPassword(keyring: Keyring, password: string): Promise<Uint8Array<ArrayBuffer>> {
  return openEnvelope(keyring.pw, password)
}

export async function unlockWithRecoveryCode(keyring: Keyring, code: string): Promise<Uint8Array<ArrayBuffer>> {
  const normalised = normalizeRecoveryCode(code)
  if (!isCompleteRecoveryCode(normalised)) throw new WrongSecretError()
  return openEnvelope(keyring.rc, normalised)
}

export async function verifyPassword(keyring: Keyring, password: string): Promise<boolean> {
  try {
    await unlockWithPassword(keyring, password)
    return true
  } catch (error: unknown) {
    if (error instanceof WrongSecretError) return false
    throw error
  }
}

/** New keyring whose password envelope opens with `newPassword`; the recovery envelope is unchanged. */
export async function rewrapPassword(
  keyring: Keyring,
  rawKey: Uint8Array<ArrayBuffer>,
  newPassword: string,
  options: KdfOptions = {},
): Promise<Keyring> {
  return { ...keyring, pw: await sealEnvelope(rawKey, newPassword, options) }
}

/** New keyring with a fresh recovery code; the previous code stops working. */
export async function renewRecoveryCode(
  keyring: Keyring,
  rawKey: Uint8Array<ArrayBuffer>,
  options: KdfOptions = {},
): Promise<{ keyring: Keyring; recoveryCode: string }> {
  const recoveryCode = generateRecoveryCode()
  const rc = await sealEnvelope(rawKey, normalizeRecoveryCode(recoveryCode), options)
  return { keyring: { ...keyring, rc }, recoveryCode }
}
