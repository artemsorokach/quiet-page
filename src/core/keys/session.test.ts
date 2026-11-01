import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { WrongSecretError } from '../crypto/errors.ts'
import { decryptJson, encryptJson } from '../crypto/dataKey.ts'
import type { Keyring, SealedJson } from '../crypto/types.ts'
import { KeySession } from './session.ts'
import type { DevicePort, DeviceRecord, SealedEntry, UserDoc, UserDocPort } from './ports.ts'

const FAST = { iterations: 1000 }

class MemoryDoc implements UserDocPort {
  doc: UserDoc | null
  entries = new Map<string, SealedEntry>()
  offline = false
  constructor(doc: UserDoc | null = null) {
    this.doc = doc
  }
  async load() {
    if (this.offline) throw new Error('offline')
    return this.doc ? { ...this.doc } : null
  }
  loadFromServer() {
    return this.load()
  }
  async saveKeyring(keyring: Keyring) {
    this.doc = { ...this.doc, keyring }
  }
  async removeLegacyFields() {
    const { salt: _salt, check: _check, ...rest } = this.doc ?? {}
    this.doc = rest
  }
  async deleteAccount() {
    this.entries.clear()
    this.doc = null
  }
  async rewriteEntries(transform: (entry: SealedEntry) => Promise<SealedEntry | null>) {
    for (const [id, entry] of this.entries) {
      const next = await transform(entry)
      if (next) this.entries.set(id, next)
    }
  }
  async deleteEverything() {
    this.entries.clear()
    this.doc = {}
  }
}

class MemoryDevice implements DevicePort {
  records = new Map<string, DeviceRecord>()
  async load(uid: string) {
    return this.records.get(uid) ?? null
  }
  async save(uid: string, record: DeviceRecord) {
    this.records.set(uid, record)
  }
  async forget(uid: string) {
    this.records.delete(uid)
  }
}

function setup(doc: UserDoc | null = null, askEveryTime = false) {
  const docPort = new MemoryDoc(doc)
  const device = new MemoryDevice()
  const session = () => new KeySession({ uid: 'u1', doc: docPort, device, askEveryTime: () => askEveryTime, kdf: FAST })
  return { docPort, device, session }
}

test('a new person creates a keyring and gets a recovery code; the device remembers the key', async () => {
  const { docPort, device, session } = setup()
  const s = session()
  assert.equal(await s.inspect(), 'new')
  const { unlocked, recoveryCode } = await s.create('secret12')
  assert.ok(docPort.doc?.keyring)
  assert.match(recoveryCode, /-/)
  assert.ok(device.records.has('u1'))
  const sealed = await encryptJson(unlocked.key, { text: 'hi' })
  const again = await session().restore()
  assert.ok(again)
  assert.deepEqual(await decryptJson(again.key, sealed), { text: 'hi' })
})

test('create refuses when a keyring already exists on the server', async () => {
  const { session } = setup()
  await session().create('secret12')
  await assert.rejects(session().create('other123'), /keyring-exists/)
})

test('open with the password on a new device; wrong password is rejected', async () => {
  const { device, session } = setup()
  await session().create('secret12')
  device.records.clear()
  const s = session()
  assert.equal(await s.restore(), null)
  assert.equal(await s.inspect(), 'open')
  await assert.rejects(s.openWithPassword('nope'), WrongSecretError)
  const { unlocked } = await s.openWithPassword('secret12')
  assert.equal(unlocked.rawKey.length, 32)
})

test('recovery code opens the key; then a new password works and the old one does not', async () => {
  const { device, session } = setup()
  const { recoveryCode } = await session().create('secret12')
  device.records.clear()
  const s = session()
  await s.inspect()
  const unlocked = await s.openWithRecoveryCode(recoveryCode.toLowerCase())
  await s.setPassword(unlocked, 'newpass1')
  const fresh = session()
  await fresh.inspect()
  await assert.rejects(fresh.openWithPassword('secret12'), WrongSecretError)
  assert.ok(await fresh.openWithPassword('newpass1'))
})

test('changing the password or the code requires the current password', async () => {
  const { session } = setup()
  const s = session()
  const { unlocked, recoveryCode } = await s.create('secret12')
  await assert.rejects(s.changePassword(unlocked, 'wrong', 'next1234'), WrongSecretError)
  await s.changePassword(unlocked, 'secret12', 'next1234')
  await assert.rejects(s.renewRecoveryCode(unlocked, 'secret12'), WrongSecretError)
  const code = await s.renewRecoveryCode(unlocked, 'next1234')
  assert.notEqual(code, recoveryCode)
  const fresh = session()
  await fresh.inspect()
  await assert.rejects(fresh.openWithRecoveryCode(recoveryCode), WrongSecretError)
  assert.ok(await fresh.openWithRecoveryCode(code))
})

test('a replaced keyring makes the device forget its old key', async () => {
  const { docPort, device, session } = setup()
  await session().create('secret12')
  await docPort.deleteEverything()
  await session().create('another1')
  device.records.set('u1', { ...(device.records.get('u1') as DeviceRecord), kid: 'old' })
  assert.equal(await session().restore(), null)
  assert.equal(device.records.has('u1'), false)
})

test('ask-every-time keeps nothing on the device', async () => {
  const { device, session } = setup(null, true)
  await session().create('secret12')
  assert.equal(device.records.size, 0)
})

test('offline without cache reports offline instead of offering a new keyring', async () => {
  const { docPort, session } = setup()
  docPort.offline = true
  assert.equal(await session().inspect(), 'offline')
})

test('legacy v1 data is migrated: new keyring, entries re-encrypted, legacy fields removed', async () => {
  const fixtures = JSON.parse(
    readFileSync(new URL('../crypto/__fixtures__/legacy-fixtures.json', import.meta.url), 'utf8'),
  ) as { v1: { password: string; userDoc: { salt: string; check: SealedJson }; entryDoc: SealedEntry; entry: unknown } }
  const { v1 } = fixtures
  const { docPort, session } = setup({ salt: v1.userDoc.salt, check: v1.userDoc.check })
  docPort.entries.set('L1', v1.entryDoc)
  const s = session()
  assert.equal(await s.inspect(), 'open')
  const { unlocked, recoveryCode } = await s.openWithPassword(v1.password)
  assert.ok(recoveryCode, 'a recovery code is shown after migration')
  assert.equal(docPort.doc?.salt, undefined)
  const migrated = docPort.entries.get('L1') as SealedEntry
  assert.equal(migrated.v, 2)
  assert.deepEqual(await decryptJson(unlocked.key, migrated), v1.entry)
})

test('start over deletes everything and asks for a new password', async () => {
  const { docPort, session } = setup()
  await session().create('secret12')
  docPort.entries.set('x', { ts: 1, v: 2, iv: 'a', ct: 'b' })
  const s = session()
  await s.startOver()
  assert.equal(docPort.entries.size, 0)
  assert.equal(await s.inspect(), 'new')
})

test('deleting the account needs the password, then removes entries, the user document and the device key', async () => {
  // Arrange
  const { docPort, device, session } = setup()
  await session().create('secret12')
  docPort.entries.set('x', { ts: 1, v: 2, iv: 'a', ct: 'b' })
  const s = session()
  await s.restore()

  // Act + Assert: a wrong password changes nothing
  await assert.rejects(s.verifyPassword('wrong-one'), WrongSecretError)
  assert.equal(docPort.entries.size, 1)

  // Act
  await s.verifyPassword('secret12')
  await s.deleteAccount()

  // Assert
  assert.equal(docPort.entries.size, 0)
  assert.equal(docPort.doc, null)
  assert.equal(device.records.has('u1'), false)
})
