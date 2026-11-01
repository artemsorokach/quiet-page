import assert from 'node:assert/strict'
import { test } from 'node:test'
import { personalKeys, wipePersonalData } from './wipe.ts'

class MapStorage {
  readonly items = new Map<string, string>()
  removeItem(key: string) {
    this.items.delete(key)
  }
}

test('signed-out wipe removes entries, the draft and own words, but keeps look and language', () => {
  // Arrange
  const storage = new MapStorage()
  for (const key of ['ts-entries', 'qp-draft:local', 'ts-myfeels', 'ts-hidfeels', 'ts-pal', 'ts-lang', 'ts-welcomed']) storage.items.set(key, 'x')

  // Act
  wipePersonalData(storage, null)

  // Assert
  assert.deepEqual([...storage.items.keys()].sort(), ['ts-lang', 'ts-pal', 'ts-welcomed'])
})

test('account wipe also removes that account’s draft and flags', () => {
  const keys = personalKeys('abc')
  for (const key of ['qp-draft:u:abc', 'ts-askpw-abc', 'ts-migrated-abc', 'ts-entries']) assert.ok(keys.includes(key), key)
  assert.ok(!keys.includes('ts-pal'))
})
