import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FEELING_KEYS, feelingLabel, normalizeFeeling } from './feelings.ts'

const locale = (lang: string) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${lang}.json`, import.meta.url), 'utf8')) as { feelings: string[] }
const uk = locale('uk').feelings
const de = locale('de').feelings

test('there is one label per key in every locale', () => {
  assert.equal(uk.length, FEELING_KEYS.length)
})

test('Ukrainian words from old records map to keys; own words stay', () => {
  assert.equal(normalizeFeeling('спокій', uk), 'calm')
  assert.equal(normalizeFeeling('calm', uk), 'calm')
  assert.equal(normalizeFeeling('моє слово', uk), 'моє слово')
})

test('labels follow the current language', () => {
  assert.equal(feelingLabel('calm', de, uk), de[0])
  assert.equal(feelingLabel('спокій', de, uk), de[0])
  assert.equal(feelingLabel('моє слово', de, uk), 'моє слово')
})
