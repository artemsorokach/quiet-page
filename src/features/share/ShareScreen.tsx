import { useEffect, useRef, useState } from 'preact/hooks'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { UK_FEELINGS } from '../../core/i18n/ukFeelings.ts'
import { dateFormat } from '../../core/journal/dates.ts'
import { asHtml, asText, type ExportContext } from '../../core/journal/exporting.ts'
import type { JournalRecord } from '../../core/store/types.ts'
import { Button } from '../../ui/Button.tsx'
import { Segmented } from '../../ui/Choice.tsx'
import { canSendFiles } from '../../core/files/saveText.ts'
import { readSetting, writeSetting } from '../../core/settings/storage.ts'
import { RichText } from '../../ui/RichText.tsx'
import { Sheet } from '../../ui/Sheet.tsx'
import { PickList } from './PickList.tsx'
import { EMPTY_SELECTION, daysWithRecords, inRange, picked, presetSelection, type Preset, type Range, type Selection } from './selection.ts'
import './Share.css'

export interface ShareRequest {
  days: readonly string[]
  /** changes on every request so the same day can be sent twice */
  nonce: number
}

interface ShareScreenProps {
  records: readonly JournalRecord[]
  scale: string
  request: ShareRequest | null
  saveFile: (name: string, text: string, type: string) => Promise<void>
  notify: (message: string) => void
}

type Format = 'html' | 'txt'
const RANGES: readonly Range[] = ['today', '7', '30', 'all', 'days']
const RANGE_LABELS = { today: 'rToday', '7': 'r7short', '30': 'r30short', all: 'rAllShort', days: 'rdays' } as const
const ABOUT_SEEN = 'ts-shareabout'
const stamp = () => new Date().toISOString().slice(0, 10)

/** Makes a read-only copy of chosen records to send to someone; the originals stay private. */
export function ShareScreen({ records, scale, request, saveFile, notify }: ShareScreenProps) {
  const i18n = useI18n()
  const { t, lang } = i18n
  const f = dateFormat(lang)
  const [range, setRange] = useState<Range>('7')
  const [days, setDays] = useState<ReadonlySet<string>>(new Set())
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION)
  const [preset, setPreset] = useState<Preset | null>('all')
  const [format, setFormat] = useState<Format>('html')
  const [picking, setPicking] = useState(false)
  const now = useRef(Date.now()).current
  const list = inRange(records, range, days, now)
  const chosen = picked(list, selection)
  const ctx: ExportContext = { i18n, ukFeelings: UK_FEELINGS, scale }
  const recordDays = daysWithRecords(records)
  const sendsFiles = useRef(canSendFiles()).current
  // The explanation is open on the first visit only; later it waits folded.
  const firstVisit = useRef(!readSetting(ABOUT_SEEN, false, (v): v is boolean => typeof v === 'boolean')).current
  useEffect(() => writeSetting(ABOUT_SEEN, true), [])
  const periodLine = list.length
    ? `${t('recordsN', { n: list.length })} · ${list.length > 1 ? `${f.day(list[list.length - 1]!.ts)} – ${f.day(list[0]!.ts)}` : f.day(list[0]!.ts)}`
    : t('emptyRange')

  useEffect(() => {
    if (!request) return
    setRange('days')
    setDays(new Set(request.days))
    resetPick()
  }, [request?.nonce])

  function resetPick() {
    setSelection(EMPTY_SELECTION)
    setPreset('all')
  }

  function changeRange(next: Range) {
    setRange(next)
    resetPick()
  }

  function toggleDay(key: string, on: boolean) {
    const next = new Set(days)
    if (on) next.add(key)
    else next.delete(key)
    setDays(next)
  }

  function ready(): JournalRecord[] | null {
    if (range === 'days' && days.size === 0) return notify(t('noDays')), null
    if (!list.length) return notify(t('emptyRange')), null
    if (!chosen.length) return notify(t('nothingPicked')), null
    return chosen
  }

  async function copy() {
    const items = ready()
    if (!items) return
    try {
      await navigator.clipboard.writeText(asText(items, ctx))
      notify(t('copied'))
    } catch {
      notify(t('copyFail'))
    }
  }

  async function save() {
    const items = ready()
    if (!items) return
    const text = format === 'html' ? asHtml(items, ctx) : asText(items, ctx)
    await saveFile(`quiet-page-${stamp()}.${format}`, text, format === 'html' ? 'text/html' : 'text/plain')
  }

  const pickSummary = !list.length ? '—' : chosen.length === list.length && !selection.noText.size && !selection.noState.size
    ? t('pickAllN', { n: list.length })
    : t('pickedOf', { n: list.length - selection.excluded.size, m: list.length })

  return (
    <section class="share" aria-label={t('tShare')}>
      <details class="share__about" open={firstVisit}>
        <summary>{t('shareAbout')}</summary>
        <p class="share__explain"><RichText text={t('shareExplain')} /></p>
      </details>

      <div>
        <p class="label">{t('which')}</p>
        <div class="share__ranges" role="group" aria-label={t('which')}>
          {RANGES.map((value) => (
            <button key={value} type="button" class="share__range" aria-pressed={range === value} onClick={() => changeRange(value)}>
              {t(RANGE_LABELS[value])}
            </button>
          ))}
        </div>
        {range !== 'days' && <p class="share__period" role="status">{periodLine}</p>}
        {range === 'days' && (
          <div class="share__days">
            {recordDays.length === 0 && <p class="share__none">{t('noRecords')}</p>}
            {recordDays.map((day) => (
              <label class="share__day" key={day.key}>
                <input type="checkbox" checked={days.has(day.key)} onChange={(e) => toggleDay(day.key, e.currentTarget.checked)} />
                <span>{f.day(day.ts)}</span>
                <small>{day.count}</small>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <p class="label">{t('pickLbl')}</p>
        <button type="button" class="share__pick" aria-haspopup="dialog" onClick={() => setPicking(true)}>
          <span>{pickSummary}</span>
          <span class="share__chevron" aria-hidden="true" />
        </button>
      </div>

      <div class="share__send">
        <p class="label">{t('asFile')}</p>
        <Segmented
          label={t('format')} value={format} onChange={setFormat}
          options={[{ value: 'html', label: t('fPage') }, { value: 'txt', label: t('fText') }]}
        />
        <p class="share__note">{t(format === 'html' ? 'fPageNote' : 'fTextNote')}</p>
        <Button onClick={save}>{t(sendsFiles ? 'sendFile' : 'exportBtn')}</Button>
        <p class="share__note">{t(sendsFiles ? 'sendFileNote' : 'saveFileNote')}</p>
      </div>

      <div class="share__send">
        <p class="label">{t('asText')}</p>
        <Button variant="ghost" onClick={copy}>{t('copyText')}</Button>
        <p class="share__note">{t('copyTextNote')}</p>
      </div>
      <p class="share__hint">{t('shareFromPath')}</p>


      <Sheet open={picking} title={t('pickLbl')} closeLabel={t('close')} onClose={() => setPicking(false)}>
        <p class="share__count">{list.length ? t('pickedOf', { n: list.length - selection.excluded.size, m: list.length }) : ''}</p>
        <Segmented
          label={t('pickLbl')}
          value={preset}
          onChange={(next) => {
            setPreset(next)
            setSelection(presetSelection(list, next))
          }}
          options={[
            { value: 'all', label: t('fAll') },
            { value: 'entries', label: t('fEntries') },
            { value: 'checks', label: t('fChecks') },
          ]}
        />
        {list.length ? (
          <PickList list={list} selection={selection} scale={scale} onChange={(next) => { setSelection(next); setPreset(null) }} />
        ) : (
          <p class="share__none">{t(range === 'days' ? 'noDays' : 'emptyRange')}</p>
        )}
        <Button variant="ghost" onClick={() => setPicking(false)}>{t('done')}</Button>
      </Sheet>
    </section>
  )
}
