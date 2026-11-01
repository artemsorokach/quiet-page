import type { Messages } from '../../core/i18n/I18nProvider.tsx'
import type { JournalRecord } from '../../core/store/types.ts'

const HOUR = 3_600_000
const DAY = 24 * HOUR

/**
 * The example shown by «Подивитися приклад» (same records as on the legacy site).
 * Each record carries a different look, so «Показувати записи в оформленні…» shows its effect at once.
 */
export function sampleRecords(messages: Messages, lang: string, now: number): JournalRecord[] {
  const d = messages.demo
  const p = messages.prompts
  const text = (i: number) => d[i] ?? ''
  return [
    { id: 'd1', type: 'check', ts: now - 2 * HOUR, mood: 4, scale: 'vaha', feelings: ['calm', 'grateful'], look: { skin: 'hlybyna', mode: 'dark', font: 'nunito' } },
    {
      id: 'd2', ts: now - DAY - 3 * HOUR, mood: 3, scale: 'voda', feelings: ['tired', 'hope'],
      qa: [{ prompt: p[0] ?? null, text: text(0) }, { prompt: null, text: text(1) }], text: `${text(0)}\n\n${text(1)}`,
      additions: [{ at: now - DAY, text: text(2) }], lang, look: { skin: 'svitanok', mode: 'light', font: 'lora' },
    },
    {
      id: 'd3', ts: now - 3 * DAY, mood: 2, scale: 'vaha', feelings: ['anxious', 'tension'],
      qa: [{ prompt: p[1] ?? null, text: text(4) }], text: text(4), editedAt: now - 3 * DAY + 2 * HOUR,
      history: [{ at: now - 3 * DAY + 2 * HOUR, qa: [{ prompt: p[1] ?? null, text: text(3) }], additions: [] }], lang,
      look: { skin: 'nich', mode: 'dark', font: 'rubik' },
    },
    { id: 'd4', type: 'check', ts: now - 5 * DAY, mood: 5, scale: 'teplo', feelings: ['joy'], look: { skin: 'lis', mode: 'light', font: 'comfortaa' } },
    { id: 'd5', ts: now - 9 * DAY, mood: 4, scale: 'tilo', feelings: ['relief'], qa: [{ prompt: null, text: text(5) }], text: text(5), lang, look: { skin: 'lavanda', mode: 'light', font: 'caveat' } },
  ] as JournalRecord[]
}
