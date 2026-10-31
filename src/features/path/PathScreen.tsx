import { Fragment } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { loadWritingFont } from '../../core/theme/look.ts'
import { recordLook } from '../../core/theme/recordLook.ts'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { dateFormat, dayKey, parseDayKey } from '../../core/journal/dates.ts'
import type { JournalRecord } from '../../core/store/types.ts'
import { Calendar } from './Calendar.tsx'
import { EntryCard, type RecordActions } from './EntryCard.tsx'
import './Path.css'

interface PathScreenProps {
  records: readonly JournalRecord[]
  scale: string
  /** show each entry in the look it was written in */
  showLook: boolean
  scaleWords: readonly string[]
  actions: RecordActions
  onSendDay: (day: string) => void
}

const thisMonth = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** Records over time: a calendar of moods and the feed of entries, newest first. */
export function PathScreen({ records, scale, showLook, scaleWords, actions, onSendDay }: PathScreenProps) {
  const { t, lang } = useI18n()
  const f = dateFormat(lang)
  const [month, setMonth] = useState(thisMonth)
  const [day, setDay] = useState<string | null>(null)
  const list = day ? records.filter((r) => dayKey(r.ts) === day) : records

  useEffect(() => {
    if (!showLook) return
    new Set(records.map((r) => recordLook(r)?.font).filter((f) => f !== undefined)).forEach((font) => void loadWritingFont(font))
  }, [showLook, records])

  function selectDay(next: string | null) {
    setDay(next)
    if (next) requestAnimationFrame(() => document.getElementById('path-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  let lastMonth = ''
  return (
    <section class="path" aria-label={t('tPath')}>
      <Calendar records={records} month={month} selectedDay={day} scaleWords={scaleWords} onMonth={setMonth} onSelectDay={selectDay} />
      <div class="path__feed" id="path-feed">
        {records.length === 0 && (
          <div class="card path__empty">
            <p>{t('empty1')}</p>
            <p class="path__hint">{t('empty2')}</p>
          </div>
        )}
        {day && (
          <div class="path__dayhead">
            <h2 class="path__month">{f.date(parseDayKey(day))}</h2>
            <div class="path__day-actions">
              {list.length > 0 && <button type="button" class="chip" onClick={() => onSendDay(day)}>{t('sendDay')}</button>}
              <button type="button" class="chip" onClick={() => setDay(null)}>{t('showAll')}</button>
            </div>
          </div>
        )}
        {day && list.length === 0 && <div class="card path__empty"><p>{t('dayEmpty')}</p></div>}
        {list.map((record) => {
          const monthTitle = f.month(record.ts)
          const header = !day && monthTitle !== lastMonth ? monthTitle : null
          lastMonth = monthTitle
          return (
            <Fragment key={record.id}>
              {header && <h2 class="path__month">{header}</h2>}
              <EntryCard record={record} scale={scale} showLook={showLook} actions={actions} />
            </Fragment>
          )
        })}
      </div>
    </section>
  )
}
