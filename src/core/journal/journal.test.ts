import { test } from 'node:test'
import assert from 'node:assert/strict'
import uk from '../../i18n/locales/uk.json' with { type: 'json' }
import type { Translator, Messages } from '../i18n/I18nProvider.tsx'
import { format } from '../i18n/format.ts'
import type { JournalRecord } from '../store/types.ts'
import { makeBackup, newRecords, parseBackup } from './backup.ts'
import { dayKey, parseDayKey } from './dates.ts'
import { diffSide, diffWords } from './diff.ts'
import { asHtml, asText, type ExportContext } from './exporting.ts'
import { revisions } from './history.ts'
import { additionsOf, applyAddition, applyEdit, moodOf, qaOf, type Scales } from './records.ts'

const messages = uk as Messages
const i18n: Translator = { lang: 'uk', messages, t: (key, params) => format(messages[key], params) }
const ctx: ExportContext = { i18n, ukFeelings: messages.feelings, scale: 'vaha' }
const T0 = new Date(2026, 9, 30, 9, 15).getTime()

const entry = (over: Partial<JournalRecord> = {}): JournalRecord =>
  ({ id: 'e1', ts: T0, mood: 4, scale: 'vaha', feelings: ['calm', 'втома'], qa: [{ prompt: 'Що сьогодні дало енергію?', text: 'Прогулянка' }], text: 'Прогулянка', lang: 'uk', ...over }) as JournalRecord

test('diffWords marks removed and added words', () => {
  const ops = diffWords('я дуже втомився', 'я трохи втомився')
  assert.deepEqual(diffSide(ops, 'before').filter((s) => s.marked).map((s) => s.text), ['дуже'])
  assert.deepEqual(diffSide(ops, 'after').filter((s) => s.marked).map((s) => s.text), ['трохи'])
})

test('diffSide keeps the space between two changed words marked', () => {
  const after = diffSide(diffWords('a b', 'x y'), 'after')
  assert.deepEqual(after, [{ text: 'x y', marked: true }])
})

test('applyEdit keeps the old text in history and revisions show the change', () => {
  const edited = applyEdit(entry(), [{ prompt: 'Що сьогодні дало енергію?', text: 'Довга прогулянка' }], [], T0 + 1000)
  assert.equal((edited as { text: string }).text, 'Довга прогулянка')
  const [step] = revisions(edited)
  assert.equal(step?.at, T0 + 1000)
  assert.deepEqual(step?.changes, [{ prompt: 'Що сьогодні дало енергію?', before: 'Прогулянка', after: 'Довга прогулянка' }])
})

test('applyEdit drops answers that became empty but never leaves qa empty', () => {
  const edited = applyEdit(entry(), [{ prompt: null, text: '' }], [{ at: 1, text: 'still here' }], T0)
  assert.deepEqual(qaOf(edited), [{ prompt: null, text: '' }])
  assert.equal((edited as { prompt: string | null }).prompt, null)
})

test('applyAddition appends without touching the original text', () => {
  const added = applyAddition(entry(), 'Ввечері ще краще', T0 + 5)
  assert.deepEqual(additionsOf(added), [{ at: T0 + 5, text: 'Ввечері ще краще' }])
  assert.equal((added as { text: string }).text, 'Прогулянка')
})

test('qaOf falls back to legacy prompt/text fields', () => {
  const old = { id: 'x', ts: 1, text: 'old', prompt: null } as unknown as JournalRecord
  assert.deepEqual(qaOf(old), [{ prompt: null, text: 'old' }])
})

test('moodOf uses the record scale, then the fallback', () => {
  const scales = messages.scales as unknown as Scales
  assert.equal(moodOf(entry({ scale: 'voda', mood: 1 }), scales, 'vaha')?.word, 'Буря')
  assert.equal(moodOf(entry({ scale: 'unknown', mood: 1 }), scales, 'vaha')?.word, 'Важко')
  assert.equal(moodOf(entry({ mood: null }), scales, 'vaha'), null)
})

test('asText lists records oldest first with state and question', () => {
  const check = { id: 'c1', type: 'check', ts: T0 + 60_000, mood: 2, scale: 'vaha', feelings: [] } as JournalRecord
  const text = asText([check, entry()], ctx)
  const [first, second] = text.split('\n\n— — —\n\n')
  assert.match(first ?? '', /Як я: Легко\nПочуття: спокій, втома\n\n«Що сьогодні дало енергію\?»\nПрогулянка$/)
  assert.match(second ?? '', /^Відмітка · /)
})

test('asHtml escapes text from entries', () => {
  const html = asHtml([entry({ qa: [{ prompt: null, text: '<script>alert(1)</script>' }] })], ctx, new Date(T0))
  assert.ok(!html.includes('<script>alert'))
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
})

test('backup round-trips and import skips records already there', () => {
  const json = makeBackup([entry()], { 'ts-scale': 'voda' }, new Date(T0))
  const parsed = parseBackup(json)
  assert.equal(parsed.entries.length, 1)
  assert.deepEqual(parsed.settings, { 'ts-scale': 'voda' })
  assert.deepEqual(newRecords([entry()], [entry(), entry({ id: 'e2' })]).map((r) => r.id), ['e2'])
})

test('parseBackup accepts a bare array and rejects other JSON', () => {
  assert.equal(parseBackup(JSON.stringify([entry(), { nope: true }])).entries.length, 1)
  assert.throws(() => parseBackup('{"hello":1}'))
})

test('dayKey matches the legacy format and parses back', () => {
  assert.equal(dayKey(T0), '2026-10-30')
  assert.equal(parseDayKey('2026-1-5').getMonth(), 0)
})
