import type { Messages } from '../../core/i18n/I18nProvider.tsx'
import { UK_FEELINGS } from '../../core/i18n/ukFeelings.ts'
import { feelingLabel } from '../../core/journal/feelings.ts'
import { feelingsOf, moodOf, type MoodTag, type Scales } from '../../core/journal/records.ts'
import type { JournalRecord } from '../../core/store/types.ts'

/** Mood word and feeling labels of a record in the current language. */
export function describeState(record: JournalRecord, messages: Messages, scale: string): { mood: MoodTag | null; feelings: string[] } {
  return {
    mood: moodOf(record, messages.scales as unknown as Scales, scale),
    feelings: feelingsOf(record, UK_FEELINGS).map((f) => feelingLabel(f, messages.feelings, UK_FEELINGS)),
  }
}
