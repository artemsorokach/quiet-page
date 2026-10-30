import { randomBytes } from './base64.ts'

/** Crockford base32: no I, L, O, U, so the code is easy to read and type. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const GROUP = 4

/** 28 characters × 5 bits = 140 bits of randomness. */
export const RECOVERY_CODE_LENGTH = 28

export function formatRecoveryCode(normalised: string): string {
  return normalised.match(new RegExp(`.{1,${GROUP}}`, 'g'))?.join('-') ?? ''
}

export function generateRecoveryCode(): string {
  // 256 is divisible by 32, so masking the low 5 bits gives an unbiased character.
  const chars = Array.from(randomBytes(RECOVERY_CODE_LENGTH), (byte) => ALPHABET.charAt(byte & 31))
  return formatRecoveryCode(chars.join(''))
}

/** Upper-cases, drops separators and maps look-alike letters (O→0, I/L→1, U→V). */
export function normalizeRecoveryCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/U/g, 'V')
    .replace(/[^0-9A-Z]/g, '')
}

export function isCompleteRecoveryCode(normalised: string): boolean {
  return normalised.length === RECOVERY_CODE_LENGTH && [...normalised].every((c) => ALPHABET.includes(c))
}
