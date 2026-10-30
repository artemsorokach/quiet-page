import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { unlockWithPassword, unlockWithRecoveryCode } from './keyring.ts'
import { decryptJson, importDataKey } from './dataKey.ts'
import { legacyKeyFromPassword, verifyLegacyPassword } from './legacy.ts'
import type { Keyring, SealedJson } from './types.ts'

// Data written by the live site (legacy/index.html) must stay readable.
const fixtures = JSON.parse(
  readFileSync(new URL('./__fixtures__/legacy-fixtures.json', import.meta.url), 'utf8'),
) as {
  v2: { password: string; recoveryCode: string; keyring: Keyring; entryDoc: SealedJson; entry: unknown }
  v1: { password: string; userDoc: { salt: string; check: SealedJson }; entryDoc: SealedJson; entry: unknown }
}

test('v2 keyring from the live site opens with the password', async () => {
  const { v2 } = fixtures
  const raw = await unlockWithPassword(v2.keyring, v2.password)
  assert.deepEqual(await decryptJson(await importDataKey(raw), v2.entryDoc), v2.entry)
})

test('v2 keyring from the live site opens with the recovery code', async () => {
  const { v2 } = fixtures
  const raw = await unlockWithRecoveryCode(v2.keyring, v2.recoveryCode)
  assert.deepEqual(await decryptJson(await importDataKey(raw), v2.entryDoc), v2.entry)
})

test('v1 (password-only) data from the live site is readable for migration', async () => {
  const { v1 } = fixtures
  const key = await legacyKeyFromPassword(v1.password, v1.userDoc.salt)
  assert.equal(await verifyLegacyPassword(v1.userDoc.check, key), true)
  assert.deepEqual(await decryptJson(key, v1.entryDoc), v1.entry)
  const wrong = await legacyKeyFromPassword('nope', v1.userDoc.salt)
  assert.equal(await verifyLegacyPassword(v1.userDoc.check, wrong), false)
})
