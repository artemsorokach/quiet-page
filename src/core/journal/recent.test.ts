import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { JournalRecord } from '../store/types.ts'
import { recentlyAdded } from './recent.ts'

const DAY = 864e5
const NOW = 100 * DAY
const entry = (id: string, ts: number, additions: { at: number; text: string }[] = []) =>
  ({ id, ts, qa: [{ prompt: null, text: 't' }], text: 't', additions }) as unknown as JournalRecord

test('lists entries added to in the last week, newest addition first', () => {
  // Arrange
  const records = [
    entry('old', NOW - 30 * DAY, [{ at: NOW - 2 * DAY, text: 'друге' }]),
    entry('older', NOW - 60 * DAY, [{ at: NOW - DAY, text: 'перше' }, { at: NOW - 20 * DAY, text: 'давнє' }]),
    entry('stale', NOW - 40 * DAY, [{ at: NOW - 9 * DAY, text: 'давно' }]),
    entry('plain', NOW - DAY),
  ]

  // Act
  const result = recentlyAdded(records, NOW)

  // Assert
  assert.deepEqual(result.map((r) => [r.record.id, r.text]), [['older', 'перше'], ['old', 'друге']])
})

test('an addition on the same day as the entry is not «recent addition» news', () => {
  const records = [entry('today', NOW - 3600e3, [{ at: NOW - 1800e3, text: 'ще' }])]
  assert.equal(recentlyAdded(records, NOW).length, 0)
})
