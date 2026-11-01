import { test } from 'node:test'
import assert from 'node:assert/strict'
import uk from '../../i18n/locales/uk.json' with { type: 'json' }
import en from '../../i18n/locales/en.json' with { type: 'json' }
import type { JournalRecord } from '../store/types.ts'
import { ownWordValue, ownWords } from './ownFeelings.ts'

test('a typed word that is already a listed feeling becomes its key', () => {
  assert.equal(ownWordValue('  Спокій ', uk.feelings, uk.feelings), 'calm')
  assert.equal(ownWordValue('Calm', en.feelings, uk.feelings), 'calm')
})

test('an own word is tidied and kept as typed', () => {
  assert.equal(ownWordValue('  легка   туга ', uk.feelings, uk.feelings), 'легка туга')
  assert.equal(ownWordValue('   ', uk.feelings, uk.feelings), '')
})

test('own words come from settings, records and the current choice, without hidden ones', () => {
  const records = [{ id: 'a', ts: 1, feelings: ['calm', 'ностальгія'] }] as unknown as JournalRecord[]
  assert.deepEqual(ownWords(['туга', 'спокій'], ['втома від людей'], records, ['втома від людей', 'нове'], uk.feelings), ['туга', 'ностальгія', 'нове'])
})
