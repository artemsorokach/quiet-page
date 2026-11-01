import type { ComponentChildren } from 'preact'
import { Fragment } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { loadWritingFont } from '../../core/theme/look.ts'
import { recordLook, type RecordLook } from '../../core/theme/recordLook.ts'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { dateFormat, dayKey, parseDayKey } from '../../core/journal/dates.ts'
import type { JournalRecord } from '../../core/store/types.ts'
import { Calendar } from './Calendar.tsx'
import { EntryCard, type RecordActions } from './EntryCard.tsx'
import { RecentAdditions } from './RecentAdditions.tsx'
import { Review, YearAgo } from './Insights.tsx'
import { PathTools, type PathTool } from './PathTools.tsx'
import { SearchPanel } from './SearchPanel.tsx'
import { isImportant, matches, onThisDayYearAgo, topFeelings } from '../../core/journal/insights.ts'
import { recentlyAdded } from '../../core/journal/recent.ts'
import './Path.css'

interface PathScreenProps {
  records: readonly JournalRecord[]
  scale: string
  /** show each entry in the look it was written in */
  showLook: boolean
  scaleWords: readonly string[]
  /** the look being written in now (where «Оформлення» starts for older entries) */
  currentLook: RecordLook
  /** shown above the feed, e.g. a reminder about unsaved text on «Сторінка» */
  notice?: ComponentChildren
  actions: RecordActions
  onSendDay: (day: string) => void
}

/** Entries drawn at once; more follow as one scrolls, so a long Path opens without a pause. */
const FIRST_BATCH = 15
const NEXT_BATCH = 30

const thisMonth = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** Records over time: a calendar of moods and the feed of entries, newest first. */
export function PathScreen({ records, scale, showLook, scaleWords, currentLook, notice, actions, onSendDay }: PathScreenProps) {
  const { t, lang } = useI18n()
  const f = dateFormat(lang)
  const [month, setMonth] = useState(thisMonth)
  const [day, setDay] = useState<string | null>(null)
  const [tool, setTool] = useState<PathTool | null>(null)
  const [query, setQuery] = useState('')
  const [feelingFilter, setFeelingFilter] = useState<string[]>([])
  const list = day
    ? records.filter((r) => dayKey(r.ts) === day)
    : tool === 'search'
      ? records.filter((r) => matches(r, query, feelingFilter))
      : tool === 'important'
        ? records.filter(isImportant)
        : records
  const [limit, setLimit] = useState(FIRST_BATCH)
  const more = useRef<HTMLDivElement>(null)
  const hasMore = list.length > limit

  useEffect(() => setLimit(FIRST_BATCH), [day, tool, query, feelingFilter])
  useEffect(() => {
    const sentinel = more.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return
    const watch = new IntersectionObserver((items) => {
      if (items.some((item) => item.isIntersecting)) setLimit((n) => n + NEXT_BATCH)
    }, { rootMargin: '600px 0px' })
    watch.observe(sentinel)
    return () => watch.disconnect()
  }, [hasMore, limit])

  useEffect(() => {
    const shown = records.map((r) => recordLook(r)).filter((look) => look && (showLook || look.chosen))
    new Set(shown.map((look) => look?.font).filter((f) => f !== undefined)).forEach((font) => void loadWritingFont(font))
  }, [showLook, records])

  function selectDay(next: string | null) {
    setDay(next)
    if (next) setTool(null)
    if (next) requestAnimationFrame(() => document.getElementById('path-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const yearAgo = onThisDayYearAgo(records, Date.now())
  const searching = !day && tool === 'search' && (query.trim() !== '' || feelingFilter.length > 0)
  let lastMonth = ''
  return (
    <section class="path" aria-label={t('tPath')}>
      {notice}
      <Calendar records={records} month={month} selectedDay={day} scaleWords={scaleWords} onMonth={setMonth} onSelectDay={selectDay} />
      {records.length > 0 && <PathTools value={day ? null : tool} onChange={(next) => { setDay(null); setTool(next) }} />}
      {!day && tool === 'search' && (
        <SearchPanel
          query={query} feelings={feelingFilter} options={topFeelings(records, 8).map(([key]) => key)}
          found={list.length} onQuery={setQuery} onFeelings={setFeelingFilter}
        />
      )}
      {!day && tool === 'important' && list.length === 0 && <p class="insight__muted path__note">{t('importantNone')}</p>}
      {!day && tool === 'review' && <Review records={records} scaleWords={scaleWords} onOpenDay={(ts) => selectDay(dayKey(ts))} />}
      {!day && !tool && yearAgo && <YearAgo record={yearAgo} onOpen={() => selectDay(dayKey(yearAgo.ts))} />}
      {!day && !tool && <RecentAdditions items={recentlyAdded(records, Date.now())} onOpen={(ts) => selectDay(dayKey(ts))} />}
      <div class="path__feed" id="path-feed" hidden={!day && tool === 'review'}>
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
        {list.slice(0, limit).map((record) => {
          const monthTitle = f.month(record.ts)
          const header = !day && monthTitle !== lastMonth ? monthTitle : null
          lastMonth = monthTitle
          return (
            <Fragment key={record.id}>
              {header && <h2 class="path__month">{header}</h2>}
              <EntryCard record={record} scale={scale} showLook={showLook} currentLook={currentLook} highlight={searching ? query : ''} actions={actions} />
            </Fragment>
          )
        })}
        {hasMore && (
          <div ref={more} class="path__more">
            <button type="button" class="chip" onClick={() => setLimit((n) => n + NEXT_BATCH)}>{t('showMore')}</button>
          </div>
        )}
      </div>
    </section>
  )
}
