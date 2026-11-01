import { useState } from 'preact/hooks'
import { UK_FEELINGS } from '../../core/i18n/ukFeelings.ts'
import { ownWordValue, ownWords } from '../../core/journal/ownFeelings.ts'
import { isFeelingKey } from '../../core/journal/feelings.ts'
import { readSetting, writeSetting } from '../../core/settings/storage.ts'
import type { JournalRecord } from '../../core/store/types.ts'

const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

/** Own feeling words, under the legacy keys `ts-myfeels` and `ts-hidfeels`. */
export function useOwnFeelings(records: readonly JournalRecord[], labels: readonly string[]) {
  const [saved, setSaved] = useState<string[]>(() => readSetting('ts-myfeels', [], isStringList))
  const [hidden, setHidden] = useState<string[]>(() => readSetting('ts-hidfeels', [], isStringList))

  return {
    words: (selected: readonly string[]) => ownWords(saved, hidden, records, selected, UK_FEELINGS),
    add(word: string): string {
      const value = ownWordValue(word, labels, UK_FEELINGS)
      if (!value || isFeelingKey(value)) return value
      const nextSaved = saved.includes(value) ? saved : [...saved, value]
      const nextHidden = hidden.filter((w) => w !== value)
      writeSetting('ts-myfeels', nextSaved)
      writeSetting('ts-hidfeels', nextHidden)
      setSaved(nextSaved)
      setHidden(nextHidden)
      return value
    },
    hide(word: string) {
      const nextSaved = saved.filter((w) => w !== word)
      const nextHidden = hidden.includes(word) ? hidden : [...hidden, word]
      writeSetting('ts-myfeels', nextSaved)
      writeSetting('ts-hidfeels', nextHidden)
      setSaved(nextSaved)
      setHidden(nextHidden)
    },
  }
}
