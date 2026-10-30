import { decodeBase64, encodeBase64, randomBytes } from '../crypto/base64.ts'
import { decryptJson, encryptJson, importDataKey } from '../crypto/dataKey.ts'
import { WrongSecretError } from '../crypto/errors.ts'
import {
  createKeyring,
  renewRecoveryCode,
  rewrapPassword,
  unlockWithPassword,
  unlockWithRecoveryCode,
} from '../crypto/keyring.ts'
import { legacyKeyFromPassword, verifyLegacyPassword } from '../crypto/legacy.ts'
import type { KdfOptions, Keyring } from '../crypto/types.ts'
import type { DevicePort, UserDoc, UserDocPort } from './ports.ts'

export interface Unlocked {
  rawKey: Uint8Array<ArrayBuffer>
  /** non-extractable AES-GCM key for entries */
  key: CryptoKey
}

/** What the password screen should show */
export type KeyState = 'new' | 'open' | 'offline'

interface KeySessionOptions {
  uid: string
  doc: UserDocPort
  device: DevicePort
  askEveryTime: () => boolean
  kdf?: KdfOptions
}

const DEVICE_IV_BYTES = 12

/**
 * Unlocks the person's data key (see ADR 0002): from this device, with the password, or with the
 * recovery code; creates it on first use; migrates the v1 password-only scheme.
 */
export class KeySession {
  private keyring: Keyring | null = null
  private legacy: Required<Pick<UserDoc, 'salt' | 'check'>> | null = null

  constructor(private readonly options: KeySessionOptions) {}

  /** The key remembered on this device, if it still matches the stored keyring. */
  async restore(): Promise<Unlocked | null> {
    const { uid, device, doc } = this.options
    if (this.options.askEveryTime()) return null
    const record = await device.load(uid)
    if (!record) return null
    let current: UserDoc | null | undefined
    try {
      current = await doc.load()
    } catch {
      current = undefined // offline: trust the device
    }
    if (current !== undefined && current?.keyring?.kid !== record.kid) {
      await device.forget(uid)
      return null
    }
    try {
      const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64(record.iv) }, record.devKey, decodeBase64(record.ct))
      if (current?.keyring) this.keyring = current.keyring
      return { rawKey: new Uint8Array(raw), key: record.dek }
    } catch {
      await device.forget(uid)
      return null
    }
  }

  async inspect(): Promise<KeyState> {
    let current: UserDoc | null
    try {
      current = await this.options.doc.load()
    } catch {
      return 'offline'
    }
    this.keyring = current?.keyring ?? null
    this.legacy = current?.salt && current.check ? { salt: current.salt, check: current.check } : null
    return this.keyring || this.legacy ? 'open' : 'new'
  }

  get hasRecoveryCode(): boolean {
    return Boolean(this.keyring?.rc)
  }

  async create(password: string): Promise<{ unlocked: Unlocked; recoveryCode: string }> {
    const existing = await this.options.doc.loadFromServer()
    if (existing?.keyring || existing?.salt) throw new Error('keyring-exists')
    const { keyring, rawKey, recoveryCode } = await createKeyring(password, this.options.kdf)
    await this.options.doc.saveKeyring(keyring)
    this.keyring = keyring
    return { unlocked: await this.unlock(rawKey), recoveryCode }
  }

  /** Returns a recovery code only when the v1 scheme was migrated just now. */
  async openWithPassword(password: string): Promise<{ unlocked: Unlocked; recoveryCode?: string }> {
    if (this.keyring) {
      const unlocked = await this.unlock(await unlockWithPassword(this.keyring, password))
      if (this.legacy) await this.finishLegacy(password, unlocked)
      return { unlocked }
    }
    if (this.legacy) return this.migrateLegacy(password)
    throw new WrongSecretError()
  }

  async openWithRecoveryCode(code: string): Promise<Unlocked> {
    if (!this.keyring) throw new WrongSecretError()
    const rawKey = await unlockWithRecoveryCode(this.keyring, code)
    return { rawKey, key: await importDataKey(rawKey) }
  }

  /** After recovery: a new password without the old one. */
  async setPassword(unlocked: Unlocked, newPassword: string): Promise<void> {
    const keyring = await this.requireKeyring()
    await this.saveKeyring(await rewrapPassword(keyring, unlocked.rawKey, newPassword, this.options.kdf))
    await this.remember(unlocked)
  }

  async changePassword(unlocked: Unlocked, current: string, next: string): Promise<void> {
    const keyring = await this.requireKeyring()
    await unlockWithPassword(keyring, current)
    await this.saveKeyring(await rewrapPassword(keyring, unlocked.rawKey, next, this.options.kdf))
  }

  async renewRecoveryCode(unlocked: Unlocked, currentPassword: string): Promise<string> {
    const keyring = await this.requireKeyring()
    await unlockWithPassword(keyring, currentPassword)
    const renewed = await renewRecoveryCode(keyring, unlocked.rawKey, this.options.kdf)
    await this.saveKeyring(renewed.keyring)
    return renewed.recoveryCode
  }

  async startOver(): Promise<void> {
    await this.options.doc.deleteEverything()
    await this.options.device.forget(this.options.uid)
    this.keyring = null
    this.legacy = null
  }

  forgetDevice(): Promise<void> {
    return this.options.device.forget(this.options.uid)
  }

  /** Called when the "ask every time" option changes. */
  async rememberIfAllowed(unlocked: Unlocked): Promise<void> {
    if (this.options.askEveryTime()) await this.forgetDevice()
    else await this.remember(unlocked)
  }

  private async unlock(rawKey: Uint8Array<ArrayBuffer>): Promise<Unlocked> {
    const unlocked = { rawKey, key: await importDataKey(rawKey) }
    await this.remember(unlocked)
    return unlocked
  }

  private async remember(unlocked: Unlocked): Promise<void> {
    if (this.options.askEveryTime()) return
    const devKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    const iv = randomBytes(DEVICE_IV_BYTES)
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, devKey, unlocked.rawKey)
    await this.options.device.save(this.options.uid, {
      kid: this.keyring?.kid ?? null,
      dek: unlocked.key,
      devKey,
      iv: encodeBase64(iv),
      ct: encodeBase64(ct),
    })
  }

  private async requireKeyring(): Promise<Keyring> {
    if (this.keyring) return this.keyring
    const current = await this.options.doc.load()
    if (!current?.keyring) throw new Error('no-keyring')
    this.keyring = current.keyring
    return current.keyring
  }

  private async saveKeyring(keyring: Keyring): Promise<void> {
    await this.options.doc.saveKeyring(keyring)
    this.keyring = keyring
  }

  private async migrateLegacy(password: string): Promise<{ unlocked: Unlocked; recoveryCode: string }> {
    const legacy = this.legacy
    if (!legacy) throw new WrongSecretError()
    const oldKey = await legacyKeyFromPassword(password, legacy.salt)
    if (!(await verifyLegacyPassword(legacy.check, oldKey))) throw new WrongSecretError()
    // Store the new keyring first; the legacy fields stay until every entry is re-encrypted.
    const { keyring, rawKey, recoveryCode } = await createKeyring(password, this.options.kdf)
    await this.saveKeyring(keyring)
    const unlocked = await this.unlock(rawKey)
    await this.finishLegacy(password, unlocked)
    return { unlocked, recoveryCode }
  }

  private async finishLegacy(password: string, unlocked: Unlocked): Promise<void> {
    const legacy = this.legacy
    if (!legacy) return
    const oldKey = await legacyKeyFromPassword(password, legacy.salt)
    await this.options.doc.rewriteEntries(async (entry) => {
      if (entry.v === 2) return null
      try {
        const value = await decryptJson(oldKey, entry)
        const sealed = await encryptJson(unlocked.key, value)
        return { ts: entry.ts, v: 2, ...sealed }
      } catch {
        return null
      }
    })
    await this.options.doc.removeLegacyFields()
    this.legacy = null
  }
}
