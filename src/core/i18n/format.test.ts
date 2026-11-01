import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectLang, format, isLang, placeholdersOf } from './format.ts'

test('format fills placeholders', () => {
  assert.equal(format('обрано {n} з {m}', { n: 2, m: 5 }), 'обрано 2 з 5')
})

test('format keeps unknown placeholders visible', () => {
  assert.equal(format('Записів: {n}'), 'Записів: {n}')
})

test('placeholdersOf lists names sorted', () => {
  assert.deepEqual(placeholdersOf('{m} of {n}'), ['m', 'n'])
  assert.deepEqual(placeholdersOf('no params'), [])
})

test('detectLang picks the first supported base language', () => {
  assert.equal(detectLang(['de-CH', 'fr']), 'de')
  assert.equal(detectLang(['ja', 'pt-BR']), 'pt')
  assert.equal(detectLang(['ja']), 'en')
  assert.equal(detectLang(['pl-PL', 'uk']), 'uk')
  assert.equal(isLang('xx'), false)
})
