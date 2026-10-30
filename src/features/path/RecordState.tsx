import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { moodColor } from '../../core/journal/records.ts'
import type { JournalRecord } from '../../core/store/types.ts'
import { describeState } from './describe.ts'

/** «Як я / Почуття» block of a record, tinted with its mood colour. */
export function RecordState({ record, scale }: { record: JournalRecord; scale: string }) {
  const { t, messages } = useI18n()
  const { mood, feelings } = describeState(record, messages, scale)
  if (!mood && !feelings.length) return null
  return (
    <dl class="state" style={mood ? { '--mc': moodColor(mood.value) } : undefined}>
      {mood && (
        <>
          <dt>{t('howI')}</dt>
          <dd class="state__mood">{mood.word}</dd>
        </>
      )}
      {feelings.length > 0 && (
        <>
          <dt>{t('feelingsLbl')}</dt>
          <dd class="state__feelings">{feelings.join(', ')}</dd>
        </>
      )}
    </dl>
  )
}
