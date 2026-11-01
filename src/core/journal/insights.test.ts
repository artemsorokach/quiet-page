import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { JournalRecord } from '../store/types.ts'
import { daysByMood, isImportant, matches, moodSides, onThisDayYearAgo, topFeelings } from './insights.ts'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()
const entry = (id: string, ts: number, extra: Record<string, unknown> = {}) =>
  ({ id, ts, qa: [{ prompt: null, text: 'текст' }], text: 'текст', ...extra }) as unknown as JournalRecord
const check = (id: string, ts: number, mood: number, feelings: string[] = []) =>
  ({ id, type: 'check', ts, mood, feelings }) as unknown as JournalRecord

test('a year ago today finds an entry written on this date last year, preferring text over a mood note', () => {
  // Arrange
  const now = at(2026, 11, 1)
  const records = [check('c', at(2025, 11, 1, 9), 3), entry('e', at(2025, 11, 1, 20)), entry('x', at(2025, 11, 2))]
  // Act + Assert
  assert.equal(onThisDayYearAgo(records, now)?.id, 'e')
  assert.equal(onThisDayYearAgo([entry('x', at(2025, 11, 2))], now), null)
})

test('days by mood counts each day once, by its average mood, only in the given month', () => {
  const records = [
    check('a', at(2026, 10, 3, 9), 5), check('b', at(2026, 10, 3, 20), 4), // average 4.5 → 5
    check('c', at(2026, 10, 4), 2),
    entry('d', at(2026, 10, 4, 21), { mood: 2 }),
    check('e', at(2026, 9, 30), 1), // other month
    entry('f', at(2026, 10, 9)), // no mood: not counted
  ]
  assert.deepEqual(daysByMood(records, 2026, 9), [0, 1, 0, 0, 1])
})

test('top feelings counts records, most frequent first, ties in first-seen order', () => {
  const records = [check('a', 1, 3, ['calm', 'tired']), check('b', 2, 3, ['tired']), check('c', 3, 3, ['hope', 'calm', 'tired'])]
  assert.deepEqual(topFeelings(records, 2), [['tired', 3], ['calm', 2]])
})

test('mood sides take written entries from full and from drained days, newest first', () => {
  const records = [
    entry('h1', 5, { mood: 5 }), entry('h2', 9, { mood: 4 }), check('hc', 10, 5),
    entry('l1', 7, { mood: 1 }), entry('l2', 8, { mood: 2 }), entry('mid', 6, { mood: 3 }),
  ]
  const sides = moodSides(records, 3)
  assert.deepEqual(sides.full.map((r) => r.id), ['h2', 'h1'])
  assert.deepEqual(sides.drained.map((r) => r.id), ['l2', 'l1'])
})

test('search matches words in text, answers and additions, ignoring case, and all chosen feelings', () => {
  const r = entry('s', 1, { qa: [{ prompt: 'Питання', text: 'Ранкова Кава' }], additions: [{ at: 2, text: 'і прогулянка' }], feelings: ['calm', 'joy'] })
  assert.equal(matches(r, 'кава', []), true)
  assert.equal(matches(r, 'ПРОГУЛЯНКА', []), true)
  assert.equal(matches(r, 'чай', []), false)
  assert.equal(matches(r, '', ['calm']), true)
  assert.equal(matches(r, '', ['calm', 'sad']), false)
})

test('important is read only from a true flag', () => {
  assert.equal(isImportant(entry('a', 1, { important: true })), true)
  assert.equal(isImportant(entry('b', 1, { important: 'yes' })), false)
  assert.equal(isImportant(entry('c', 1)), false)
})
