import { test } from 'node:test'
import assert from 'node:assert/strict'
import { composeRecord, newRecordId, type WriteForm } from './composeRecord.ts'
import type { EntryRecord } from '../../core/store/types.ts'

const base: WriteForm = {
  mood: null,
  scale: 'vaha',
  feelings: [],
  question: { text: 'Що сьогодні дало енергію?', index: 0 },
  answer: '',
  free: '',
  lang: 'uk',
}

test('nothing filled in gives no record', () => {
  assert.equal(composeRecord(base, 'e1', 100), null)
})

test('answer and free text become an entry in the legacy shape', () => {
  const record = composeRecord({ ...base, mood: 4, feelings: ['спокій'], answer: ' Прогулянка ', free: 'Тихий вечір' }, 'e1', 100)
  assert.deepEqual(record, {
    id: 'e1',
    ts: 100,
    mood: 4,
    scale: 'vaha',
    feelings: ['спокій'],
    qa: [
      { prompt: 'Що сьогодні дало енергію?', qi: 0, text: 'Прогулянка' },
      { prompt: null, text: 'Тихий вечір' },
    ],
    text: 'Прогулянка\n\nТихий вечір',
    prompt: 'Що сьогодні дало енергію?',
    lang: 'uk',
  })
})

test('a hidden question ignores the answer field', () => {
  const record = composeRecord({ ...base, question: null, answer: 'old', free: 'Вільно' }, 'e1', 100)
  assert.deepEqual((record as EntryRecord | null)?.qa, [{ prompt: null, text: 'Вільно' }])
})

test('mood or feelings without text become a mood note (check)', () => {
  assert.deepEqual(composeRecord({ ...base, mood: 2 }, 'c1', 100), {
    id: 'c1',
    type: 'check',
    ts: 100,
    mood: 2,
    scale: 'vaha',
    feelings: [],
  })
})

test('ids look like the legacy ones and differ', () => {
  const a = newRecordId(1761800000000)
  const b = newRecordId(1761800000000)
  assert.match(a, /^e[0-9a-z]+$/)
  assert.notEqual(a, b)
})

test('the look of the moment is kept with entries and mood notes', () => {
  const look = { skin: 'lavanda', mode: 'dark' as const, font: 'lora' }
  assert.deepEqual(composeRecord({ ...base, free: 'Вечір', look }, 'e1', 100)?.look, look)
  assert.deepEqual(composeRecord({ ...base, mood: 3, look }, 'e2', 100)?.look, look)
})
