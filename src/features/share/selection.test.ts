import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { JournalRecord } from '../../core/store/types.ts'
import { EMPTY_SELECTION, daysWithRecords, inRange, picked, presetSelection, setIncluded, setPart } from './selection.ts'

const DAY = 86_400_000
const NOW = new Date(2026, 9, 30, 12).getTime()
const entry = (id: string, ago: number, over: Partial<JournalRecord> = {}): JournalRecord =>
  ({ id, ts: NOW - ago * DAY, mood: 3, scale: 'vaha', feelings: ['calm'], qa: [{ prompt: null, text: `text ${id}` }], text: `text ${id}`, ...over }) as JournalRecord
const check = (id: string, ago: number): JournalRecord => ({ id, type: 'check', ts: NOW - ago * DAY, mood: 4, scale: 'vaha', feelings: [] })

const records = [entry('a', 1), check('b', 2), entry('c', 10), entry('d', 40, { mood: null, feelings: [] })]

test('inRange keeps the period, newest first', () => {
  assert.deepEqual(inRange(records, '7', new Set(), NOW).map((r) => r.id), ['a', 'b'])
  assert.deepEqual(inRange(records, '30', new Set(), NOW).map((r) => r.id), ['a', 'b', 'c'])
  assert.equal(inRange(records, 'all', new Set(), NOW).length, 4)
})

test('inRange with chosen days and daysWithRecords agree', () => {
  const days = daysWithRecords(records)
  assert.equal(days.length, 4)
  assert.deepEqual(inRange(records, 'days', new Set([days[1]!.key]), NOW).map((r) => r.id), ['b'])
})

test('preset "checks" keeps only mood parts and drops entries without them', () => {
  const sel = presetSelection(records, 'checks')
  const out = picked(records, sel)
  assert.deepEqual(out.map((r) => r.id), ['a', 'b', 'c'])
  assert.ok(out.every((r) => r.type === 'check'))
})

test('preset "entries" drops mood notes', () => {
  assert.deepEqual(picked(records, presetSelection(records, 'entries')).map((r) => r.id), ['a', 'c', 'd'])
})

test('unticking both parts of an entry leaves it out; ticking it again restores everything', () => {
  const a = records[0]!
  let sel = setPart(EMPTY_SELECTION, a, 'text', false)
  assert.equal(picked([a], sel)[0]?.type, 'check')
  sel = setPart(sel, a, 'state', false)
  assert.equal(picked([a], sel).length, 0)
  sel = setIncluded(sel, a.id, true)
  assert.deepEqual(picked([a], sel), [a])
})

test('without mood the entry is sent with empty state', () => {
  const sel = setPart(EMPTY_SELECTION, records[0]!, 'state', false)
  const [out] = picked([records[0]!], sel)
  assert.equal(out?.mood, null)
  assert.equal((out as { text: string }).text, 'text a')
})

test('«Сьогодні» keeps only records from today’s date', () => {
  const now = new Date(2026, 10, 1, 9).getTime()
  const list = [
    { id: 'm', ts: new Date(2026, 10, 1, 7).getTime() },
    { id: 'y', ts: new Date(2026, 9, 31, 23).getTime() },
  ] as unknown as JournalRecord[]
  assert.deepEqual(inRange(list, 'today', new Set(), now).map((r) => r.id), ['m'])
})
