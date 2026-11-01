import { useState } from 'preact/hooks'
import { UK_FEELINGS } from '../../core/i18n/ukFeelings.ts'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { dateFormat } from '../../core/journal/dates.ts'
import { feelingLabel } from '../../core/journal/feelings.ts'
import { daysByMood, moodSides, topFeelings } from '../../core/journal/insights.ts'
import { moodColor, qaOf } from '../../core/journal/records.ts'
import type { JournalRecord } from '../../core/store/types.ts'
import { Segmented } from '../../ui/Choice.tsx'

const firstText = (record: JournalRecord) => qaOf(record).find((q) => q.text)?.text ?? ''

/** «Рік тому сьогодні»: shown only when there is such an entry. */
export function YearAgo({ record, onOpen }: { record: JournalRecord; onOpen: () => void }) {
  const { t, lang } = useI18n()
  const f = dateFormat(lang)
  const text = firstText(record)
  return (
    <div class="insight">
      <p class="insight__label">{t('yearAgo', { date: f.day(record.ts) + ' ' + new Date(record.ts).getFullYear() })}</p>
      {text && <p class="insight__text insight__text--clamp">{text}</p>}
      <button type="button" class="insight__link" onClick={onOpen}>{t('openEntry')}</button>
    </div>
  )
}

interface ReviewProps {
  records: readonly JournalRecord[]
  scaleWords: readonly string[]
  onOpenDay: (ts: number) => void
}

/** «Огляд»: what the month held — days by state, frequent feelings, what fills and what drains. No scores. */
export function Review({ records, scaleWords, onOpenDay }: ReviewProps) {
  const { t, lang, messages } = useI18n()
  const f = dateFormat(lang)
  const now = new Date()
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [side, setSide] = useState<'full' | 'drained'>('full')
  const inMonth = records.filter((r) => {
    const d = new Date(r.ts)
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()
  })
  const days = daysByMood(inMonth, month.getFullYear(), month.getMonth())
  const feelings = topFeelings(inMonth, 4)
  const sides = moodSides(inMonth, 3)
  const shown = sides[side]
  const nearFeelings = topFeelings(shown, 3).map(([key]) => feelingLabel(key, messages.feelings, UK_FEELINGS))
  const isThisMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth()
  const shift = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1))

  return (
    <>
      <div class="insight">
        <p class="insight__label">{t('reviewLbl')}</p>
        <div class="insight__month">
          <button type="button" class="insight__nav" aria-label={t('prevMonth')} onClick={() => shift(-1)}>‹</button>
          <h3 class="insight__title">{f.month(month)}</h3>
          <button type="button" class="insight__nav" aria-label={t('nextMonth')} disabled={isThisMonth} onClick={() => shift(1)}>›</button>
        </div>
        {days.some(Boolean) ? (
          <ul class="mood-rows">
            {[5, 4, 3, 2, 1].filter((m) => days[m - 1]).map((m) => (
              <li key={m}>
                <span class="mood-rows__word">{scaleWords[m - 1]}</span>
                <span class="mood-rows__dots" aria-label={t('daysCount', { n: days[m - 1] ?? 0 })}>
                  {Array.from({ length: days[m - 1] ?? 0 }, (_, i) => <i key={i} style={{ background: moodColor(m) }} />)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p class="insight__muted">{t('reviewEmpty')}</p>
        )}
        {feelings.length > 0 && (
          <>
            <p class="insight__label insight__label--inner">{t('reviewFeelings')}</p>
            <div class="insight__chips">
              {feelings.map(([key, n]) => (
                <span key={key} class="insight__chip">{feelingLabel(key, messages.feelings, UK_FEELINGS)} <b>{n}</b></span>
              ))}
            </div>
          </>
        )}
      </div>

      {(sides.full.length > 0 || sides.drained.length > 0) && (
        <div class="insight">
          <p class="insight__label">{t('sidesLbl')}</p>
          <Segmented
            value={side} label={t('sidesLbl')}
            options={[{ value: 'full', label: t('sideFull') }, { value: 'drained', label: t('sideDrained') }]}
            onChange={setSide}
          />
          {shown.length === 0 && <p class="insight__muted">{t('sideNone')}</p>}
          {shown.map((r) => (
            <button key={r.id} type="button" class="insight__snip" style={{ '--snip': moodColor(r.mood ?? 3) }} onClick={() => onOpenDay(r.ts)}>
              <small>{f.day(r.ts)} · {scaleWords[(r.mood ?? 3) - 1]}</small>
              <span>{firstText(r)}</span>
            </button>
          ))}
          {nearFeelings.length > 0 && <p class="insight__muted">{t('sideNear', { words: nearFeelings.join(', ') })}</p>}
        </div>
      )}

      <p class="insight__question">{t('reviewQuestion')}</p>
    </>
  )
}
