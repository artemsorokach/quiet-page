import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { dateFormat } from '../../core/journal/dates.ts'
import { isCheck, qaOf } from '../../core/journal/records.ts'
import type { JournalRecord } from '../../core/store/types.ts'
import { describeState } from '../path/describe.ts'
import { hasState, setIncluded, setPart, type Selection } from './selection.ts'

interface PickListProps {
  list: readonly JournalRecord[]
  selection: Selection
  scale: string
  onChange: (selection: Selection) => void
}

/** Each record with a tick box; entries also let the text or the mood be left out. */
export function PickList({ list, selection, scale, onChange }: PickListProps) {
  const { t, lang, messages } = useI18n()
  const f = dateFormat(lang)
  const describe = (record: JournalRecord) => describeState(record, messages, scale)

  return (
    <div class="pick-list">
      {list.map((record) => {
        const when = `${f.day(record.ts)}, ${f.time(record.ts)}`
        const included = !selection.excluded.has(record.id)
        const { mood, feelings } = describe(record)
        if (isCheck(record)) {
          const summary = [mood?.word, ...feelings].filter(Boolean).join(', ') || '—'
          return (
            <div class={`pick-item${included ? '' : ' pick-item--off'}`} key={record.id}>
              <label class="pick-item__row">
                <input type="checkbox" checked={included} onChange={(e) => onChange(setIncluded(selection, record.id, e.currentTarget.checked))} />
                <span class="pick-item__info">
                  <span class="pick-item__when">{t('checkLbl')} · {when}</span>
                  <span class="pick-item__text">{summary}</span>
                </span>
              </label>
            </div>
          )
        }
        const withState = hasState(record)
        const stateOn = included && withState && !selection.noState.has(record.id)
        const textOn = included && !selection.noText.has(record.id)
        const firstText = qaOf(record).find((item) => item.text)?.text.replace(/\s+/g, ' ') ?? '—'
        const state = [mood ? `${t('howI')}: ${mood.word}` : '', feelings.length ? `${t('feelingsLbl')}: ${feelings.join(', ')}` : '']
          .filter(Boolean)
          .join(' · ')
        return (
          <div class={`pick-item${included ? '' : ' pick-item--off'}`} key={record.id}>
            <label class="pick-item__row">
              <input
                type="checkbox"
                checked={included}
                indeterminate={included && ((withState && !stateOn) || !textOn)}
                onChange={(e) => onChange(setIncluded(selection, record.id, e.currentTarget.checked))}
              />
              <span class="pick-item__when">{t('entryLbl')} · {when}</span>
            </label>
            <div class="pick-item__parts">
              {withState && (
                <label class={`pick-item__part${stateOn ? '' : ' pick-item__part--off'}`}>
                  <input type="checkbox" checked={stateOn} onChange={(e) => onChange(setPart(selection, record, 'state', e.currentTarget.checked))} />
                  <span class="pick-item__state">{state}</span>
                </label>
              )}
              <label class={`pick-item__part${textOn ? '' : ' pick-item__part--off'}`}>
                <input type="checkbox" checked={textOn} onChange={(e) => onChange(setPart(selection, record, 'text', e.currentTarget.checked))} />
                <span class="pick-item__text">{firstText}</span>
              </label>
            </div>
          </div>
        )
      })}
    </div>
  )
}
