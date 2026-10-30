import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  RECOVERY_CODE_LENGTH,
  formatRecoveryCode,
  generateRecoveryCode,
  isCompleteRecoveryCode,
  normalizeRecoveryCode,
} from './recoveryCode.ts'

test('generated code has 7 groups of 4 Crockford characters', () => {
  const code = generateRecoveryCode()
  assert.match(code, /^([0-9A-HJKMNP-TV-Z]{4}-){6}[0-9A-HJKMNP-TV-Z]{4}$/)
})

test('generated codes differ', () => {
  assert.notEqual(generateRecoveryCode(), generateRecoveryCode())
})

test('normalize removes separators and fixes look-alike letters', () => {
  assert.equal(normalizeRecoveryCode(' 6jgq-cxbk tbb5 '), '6JGQCXBKTBB5')
  assert.equal(normalizeRecoveryCode('OIL u'), '011V')
})

test('a normalised generated code is complete', () => {
  const normalised = normalizeRecoveryCode(generateRecoveryCode())
  assert.equal(normalised.length, RECOVERY_CODE_LENGTH)
  assert.equal(isCompleteRecoveryCode(normalised), true)
  assert.equal(isCompleteRecoveryCode('ABCD'), false)
})

test('format groups a normalised code back into XXXX-XXXX', () => {
  assert.equal(formatRecoveryCode('6JGQCXBKTBB5'), '6JGQ-CXBK-TBB5')
})
