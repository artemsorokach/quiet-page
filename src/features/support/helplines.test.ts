import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COUNTRIES, HELPLINES, guessCountry, telHref } from './helplines.ts'

test('every country has at least one helpline and an emergency number', () => {
  for (const country of COUNTRIES) {
    const entry = HELPLINES[country]
    assert.ok(entry.lines.length > 0, `${country} has no helpline`)
    assert.match(entry.emergency, /^\d{2,4}$/, `${country} emergency number`)
  }
})

test('every number becomes a dialable tel: link', () => {
  for (const country of COUNTRIES) {
    for (const line of HELPLINES[country].lines) {
      assert.match(telHref(line.number), /^tel:\+?\d{3,15}$/, `${country} ${line.number}`)
    }
  }
})

test('Lifeline Ukraine 7333 is not listed while it is paused', () => {
  assert.ok(HELPLINES.UA.lines.every((line) => line.number !== '7333'))
})

test('every line says which languages it answers in', () => {
  for (const country of COUNTRIES) {
    for (const line of HELPLINES[country].lines) assert.ok(line.langs.length > 0, `${country} ${line.number}`)
  }
})

test('guessCountry prefers the time zone, then the language region', () => {
  assert.equal(guessCountry('Europe/Zurich', ['uk']), 'CH')
  assert.equal(guessCountry('Europe/Kyiv', ['en-US']), 'UA')
  assert.equal(guessCountry('Asia/Tokyo', ['de-AT']), 'AT')
  assert.equal(guessCountry('Asia/Tokyo', ['ja']), 'CH')
})
