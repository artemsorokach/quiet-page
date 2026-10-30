import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  WrongSecretError,
  createKeyring,
  renewRecoveryCode,
  rewrapPassword,
  unlockWithPassword,
  unlockWithRecoveryCode,
  verifyPassword,
} from './keyring.ts'
import { decryptJson, encryptJson, importDataKey } from './dataKey.ts'

// Low iteration count keeps unit tests fast; the default (600 000) is covered in envelope.test.ts.
const FAST = { iterations: 1000 }

test('createKeyring returns a keyring, the raw data key and a recovery code', async () => {
  const { keyring, rawKey, recoveryCode } = await createKeyring('secret12', FAST)
  assert.equal(keyring.v, 2)
  assert.equal(rawKey.length, 32)
  assert.ok(keyring.kid.length > 0)
  assert.match(recoveryCode, /-/)
})

test('password and recovery code both open the same data key', async () => {
  const { keyring, rawKey, recoveryCode } = await createKeyring('secret12', FAST)
  assert.deepEqual(await unlockWithPassword(keyring, 'secret12'), rawKey)
  assert.deepEqual(await unlockWithRecoveryCode(keyring, recoveryCode.toLowerCase()), rawKey)
})

test('wrong password and wrong code are rejected with WrongSecretError', async () => {
  const { keyring } = await createKeyring('secret12', FAST)
  await assert.rejects(unlockWithPassword(keyring, 'nope'), WrongSecretError)
  await assert.rejects(unlockWithRecoveryCode(keyring, 'AAAA-BBBB'), WrongSecretError)
  assert.equal(await verifyPassword(keyring, 'nope'), false)
  assert.equal(await verifyPassword(keyring, 'secret12'), true)
})

test('rewrapPassword changes only the password envelope and does not mutate', async () => {
  const { keyring, rawKey, recoveryCode } = await createKeyring('secret12', FAST)
  const next = await rewrapPassword(keyring, rawKey, 'newpass1', FAST)
  assert.notEqual(next, keyring)
  assert.deepEqual(next.rc, keyring.rc)
  assert.equal(next.kid, keyring.kid)
  assert.deepEqual(await unlockWithPassword(next, 'newpass1'), rawKey)
  await assert.rejects(unlockWithPassword(next, 'secret12'), WrongSecretError)
  assert.deepEqual(await unlockWithRecoveryCode(next, recoveryCode), rawKey)
  assert.deepEqual(await unlockWithPassword(keyring, 'secret12'), rawKey)
})

test('renewRecoveryCode invalidates the old code and keeps the password', async () => {
  const { keyring, rawKey, recoveryCode } = await createKeyring('secret12', FAST)
  const renewed = await renewRecoveryCode(keyring, rawKey, FAST)
  assert.notEqual(renewed.recoveryCode, recoveryCode)
  assert.deepEqual(await unlockWithRecoveryCode(renewed.keyring, renewed.recoveryCode), rawKey)
  await assert.rejects(unlockWithRecoveryCode(renewed.keyring, recoveryCode), WrongSecretError)
  assert.deepEqual(await unlockWithPassword(renewed.keyring, 'secret12'), rawKey)
})

test('entries encrypted with the data key round-trip', async () => {
  const { rawKey } = await createKeyring('secret12', FAST)
  const key = await importDataKey(rawKey)
  const entry = { ts: 1, text: 'Тиша' }
  const sealed = await encryptJson(key, entry)
  assert.ok(!sealed.ct.includes('Тиша'))
  assert.deepEqual(await decryptJson(key, sealed), entry)
})
