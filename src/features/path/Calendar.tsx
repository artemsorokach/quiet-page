import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { LOCALES, dateFormat, dayKey } from '../../core/journal/dates.ts'
import { moodColor } from '../../core/journal/records.ts'
import type { JournalRecord } from '../../core/store/types.ts'

interface CalendarProps {
  records: readonly JournalRecord[]
  /** first day of the shown month */
  month: Date
  selectedDay: string | null
  /** the five words of the current scale, for the legend */
  scaleWords: readonly string[]
  onMonth: (month: Date) => void
  onSelectDay: (day: string | null) => void
}

const DAYS_IN_WEEK = 7
const MONDAY = new Date(2024, 0, 1)
const pad = (n: number) => String(n).padStart(2, '0')
const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

function groupByDay(records: readonly JournalRecord[]) {
  const days = new Map<string, JournalRecord[]>()
  for (const record of records) {
    const key = dayKey(record.ts)
    days.set(key, [...(days.get(key) ?? []), record])
  }
  return days
}

function averageMood(list: readonly JournalRecord[]): number | null {
  const moods = list.map((r) => r.mood).filter((m): m is number => typeof m === 'number' && m >= 1)
  return moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null
}

/** Month grid: each day with records shows the day's average mood as a dot. */
export function Calendar({ records, month, selectedDay, scaleWords, onMonth, onSelectDay }: CalendarProps) {
  const { t, lang } = useI18n()
  const f = dateFormat(lang)
  const locale = LOCALES[lang]
  const byDay = groupByDay(records)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const year = month.getFullYear()
  const m = month.getMonth()
  const isCurrent = year === today.getFullYear() && m === today.getMonth()
  const lead = (month.getDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })

  function pick(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value
    if (!value) return
    const [y = year, mo = 1, d = 1] = value.split('-').map(Number)
    onMonth(new Date(y, mo - 1, 1))
    onSelectDay(dayKey(new Date(y, mo - 1, d)))
  }

  return (
    <div class="card calendar">
      <div class="calendar__head">
        <button type="button" class="calendar__nav" aria-label={t('calPrev')} onClick={() => onMonth(new Date(year, m - 1, 1))}>‹</button>
        <label class="calendar__title">
          <span>{f.month(month)}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
            <rect x="4" y="5" width="16" height="15" rx="3" />
            <path d="M4 10h16M9 3v4M15 3v4" />
          </svg>
          <input
            type="date"
            class="calendar__pick"
            aria-label={t('pickDate')}
            max={`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`}
            onChange={pick}
          />
        </label>
        <button type="button" class="calendar__nav" aria-label={t('calNext')} disabled={month >= firstOfMonth(today)} onClick={() => onMonth(new Date(year, m + 1, 1))}>›</button>
      </div>
      {(!isCurrent || selectedDay) && (
        <div class="calendar__today">
          <button type="button" class="chip" onClick={() => { onMonth(firstOfMonth(today)); onSelectDay(null) }}>{t('today')}</button>
        </div>
      )}
      <div class="calendar__grid">
        {Array.from({ length: DAYS_IN_WEEK }, (_, i) => (
          <span key={`w${i}`} class="calendar__weekday">{weekday.format(new Date(2024, 0, MONDAY.getDate() + i)).replace('.', '')}</span>
        ))}
        {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(year, m, i + 1)
          const key = dayKey(date)
          const list = byDay.get(key)
          const classes = ['calendar__day']
          if (date > today) classes.push('calendar__day--future')
          if (+date === +today) classes.push('calendar__day--today')
          if (!list) {
            if (date <= today) classes.push('calendar__day--empty')
            return <span key={key} class={classes.join(' ')}>{i + 1}<i /></span>
          }
          const mood = averageMood(list)
          if (mood === null) classes.push('calendar__day--nomood')
          if (selectedDay === key) classes.push('calendar__day--selected')
          return (
            <button
              key={key}
              type="button"
              class={classes.join(' ')}
              aria-label={`${f.day(date)}: ${list.length}`}
              aria-pressed={selectedDay === key}
              onClick={() => onSelectDay(selectedDay === key ? null : key)}
            >
              {i + 1}
              <i style={mood === null ? undefined : { background: moodColor(mood) }} />
            </button>
          )
        })}
      </div>
      <div class="calendar__legend">
        {[1, 3, 5].map((v) => (
          <span key={v}><i style={{ background: moodColor(v) }} />{scaleWords[v - 1]?.toLowerCase()}</span>
        ))}
        <span><i class="calendar__legend-nomood" />{t('noMood')}</span>
      </div>
      <p class="calendar__hint">{t('calHint')}</p>
    </div>
  )
}
