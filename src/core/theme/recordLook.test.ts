import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lookAttributes, recordLook } from './recordLook.ts'

test('recordLook reads a saved look', () => {
  assert.deepEqual(recordLook({ look: { skin: 'lavanda', mode: 'dark', font: 'lora' } }), { skin: 'lavanda', mode: 'dark', font: 'lora' })
})

test('recordLook ignores missing or unknown values', () => {
  assert.equal(recordLook({}), null)
  assert.equal(recordLook({ look: { skin: 'neon', mode: 'dark', font: 'lora' } }), null)
  assert.equal(recordLook({ look: { skin: 'lis', mode: 'dim', font: 'lora' } }), null)
  assert.equal(recordLook({ look: { skin: 'lis', mode: 'light', font: '<x>' } })?.font, 'nunito')
})

test('lookAttributes marks the card, or nothing without a look', () => {
  assert.deepEqual(lookAttributes({ skin: 'lis', mode: 'light', font: 'caveat' }), { 'data-look': 'lis-light', 'data-look-font': 'caveat' })
  assert.deepEqual(lookAttributes(null), {})
})

test('a look picked later in the Path is marked as chosen; anything else in that field is ignored', () => {
  assert.equal(recordLook({ look: { skin: 'lis', mode: 'light', font: 'lora', chosen: true } })?.chosen, true)
  assert.equal(recordLook({ look: { skin: 'lis', mode: 'light', font: 'lora', chosen: 'yes' } })?.chosen, undefined)
})
