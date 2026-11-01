import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { dateFormat } from '../../core/journal/dates.ts'
import { additionsOf, applyAddition, historyOf, isCheck, qaOf } from '../../core/journal/records.ts'
import type { JournalRecord } from '../../core/store/types.ts'
import { lookAttributes, recordLook, type RecordLook } from '../../core/theme/recordLook.ts'
import { ConfirmButton } from '../../ui/ConfirmButton.tsx'
import { AdditionEditor, EntryEditor } from './EntryEditor.tsx'
import { History } from './History.tsx'
import { LookPicker } from './LookPicker.tsx'
import { Highlighted } from './Highlighted.tsx'
import { isImportant } from '../../core/journal/insights.ts'
import { BookmarkIcon } from '../../ui/icons.tsx'
import { RecordState } from './RecordState.tsx'

export interface RecordActions {
  /** Saves a changed record; resolves false (after telling the person) when it failed. */
  save: (record: JournalRecord, done: 'added' | 'edited' | 'restyled' | 'marked' | 'unmarked') => Promise<boolean>
  remove: (record: JournalRecord) => void
  send: (record: JournalRecord) => void
  notify: (message: string) => void
}

interface CardProps {
  record: JournalRecord
  scale: string
  showLook?: boolean
  /** the look being written in now: where «Оформлення» starts for entries saved without one */
  currentLook?: RecordLook
  /** search words to mark softly in the text */
  highlight?: string
  actions: RecordActions
}

/** An entry shows its look when the setting is on, or always when the person picked one for it. */
const shownLook = (record: JournalRecord, showLook?: boolean) => {
  const look = recordLook(record)
  return showLook || look?.chosen ? look : null
}

/** A mood note without text. */
export function CheckCard({ record, scale, showLook, actions }: CardProps) {
  const { t, lang } = useI18n()
  const f = dateFormat(lang)
  return (
    <div class="card entry entry--check" {...lookAttributes(shownLook(record, showLook))}>
      <div class="entry__check-head">
        <span>{t('checkLbl')} · {f.day(record.ts)}, {f.time(record.ts)}</span>
        <ImportantMark record={record} actions={actions} />
        <ConfirmButton label={t('remove')} confirmLabel={t('removeConfirm')} class="link-btn entry__remove" onConfirm={() => actions.remove(record)} />
      </div>
      <RecordState record={record} scale={scale} />
    </div>
  )
}

/** «Важливе»: a bookmark on entries and on mood notes alike. */
function ImportantMark({ record, actions }: { record: JournalRecord; actions: RecordActions }) {
  const { t } = useI18n()
  const on = isImportant(record)
  return (
    <button
      type="button" class="entry__mark" aria-pressed={on} aria-label={t('important')}
      onClick={() => void actions.save({ ...record, important: !on } as JournalRecord, on ? 'unmarked' : 'marked')}
    >
      <BookmarkIcon />
    </button>
  )
}

type Mode = 'view' | 'edit' | 'add' | 'look'

/** One entry in the Path: text clamped to a few lines, with a quiet menu of actions. */
export function EntryCard({ record, scale, showLook, currentLook, highlight = '', actions }: CardProps) {
  const { t, lang } = useI18n()
  const f = dateFormat(lang)
  const [mode, setModeState] = useState<Mode>('view')
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  const hasHistory = historyOf(record).length > 0
  /** the look shown while «Оформлення» is open, before «Готово» */
  const [trying, setTrying] = useState<RecordLook | null>(null)
  const fallbackLook: RecordLook = currentLook ?? { skin: 'hlybyna', mode: 'dark', font: 'nunito' }

  useLayoutEffect(() => {
    const el = body.current
    if (el && !expanded) setOverflows(el.scrollHeight > el.clientHeight + 2)
  }, [record, expanded, mode])

  function setMode(next: Mode) {
    setMenuOpen(false)
    setModeState(next)
  }

  if (isCheck(record)) return <CheckCard record={record} scale={scale} showLook={showLook} actions={actions} />

  return (
    <article class="card entry" {...lookAttributes(trying ?? shownLook(record, showLook))}>
      <div class="entry__head">
        <span>{f.date(record.ts)}, {f.time(record.ts)}</span>
        <ImportantMark record={record} actions={actions} />
        {hasHistory && (
          <button type="button" class="entry__edited" aria-expanded={historyOpen} onClick={() => setHistoryOpen(!historyOpen)}>
            {t('edited')}
          </button>
        )}
      </div>
      <RecordState record={record} scale={scale} />
      {mode === 'edit' ? (
        <EntryEditor
          record={record}
          onSave={(next) => actions.save(next, 'edited')}
          onCancel={() => setMode('view')}
          onEmpty={() => actions.notify(t('notEmpty'))}
        />
      ) : (
        <div ref={body} class={`entry__body${expanded || mode === 'add' ? '' : ' entry__body--clamp'}`}>
          {qaOf(record).filter((item) => item.text).map((item, i) => (
            <div key={i}>
              {item.prompt && <p class="entry__question">{item.prompt}</p>}
              <p class="entry__text"><Highlighted text={item.text} query={highlight} /></p>
            </div>
          ))}
          {additionsOf(record).map((a) => (
            <div key={a.at}>
              <p class="entry__addition-meta">{t('addition')} · {f.day(a.at)}, {f.time(a.at)}</p>
              <p class="entry__text"><Highlighted text={a.text} query={highlight} /></p>
            </div>
          ))}
        </div>
      )}
      {historyOpen && <History record={record} />}
      {mode === 'look' && (
        <LookPicker
          value={recordLook(record) ?? fallbackLook}
          onChange={setTrying}
          onCancel={() => {
            setTrying(null)
            setMode('view')
          }}
          onDone={() => {
            const chosen = trying
            setTrying(null)
            setMode('view')
            if (chosen) void actions.save({ ...record, look: { skin: chosen.skin, mode: chosen.mode, font: chosen.font, chosen: true } }, 'restyled')
          }}
        />
      )}
      {mode === 'add' && (
        <AdditionEditor onAdd={(text) => actions.save(applyAddition(record, text, Date.now()), 'added')} onCancel={() => setMode('view')} />
      )}
      {mode === 'view' && (
        <>
          <div class="entry__foot">
            <button type="button" class="entry__more" hidden={!overflows && !expanded} onClick={() => setExpanded(!expanded)}>
              {expanded ? t('collapse') : t('readMore')}
            </button>
            <button type="button" class="entry__dots" aria-expanded={menuOpen} aria-label={t('actions')} onClick={() => setMenuOpen(!menuOpen)}>
              •••
            </button>
          </div>
          {menuOpen && (
            <div class="entry__menu">
              <button type="button" class="link-btn" onClick={() => setMode('add')}>{t('mAdd')}</button>
              <button type="button" class="link-btn" onClick={() => setMode('edit')}>{t('mEdit')}</button>
              <button type="button" class="link-btn" onClick={() => setMode('look')}>{t('mLook')}</button>
              <button type="button" class="link-btn" onClick={() => { setMenuOpen(false); actions.send(record) }}>{t('mSend')}</button>
              <ConfirmButton label={t('mDel')} confirmLabel={t('delConfirm')} onConfirm={() => actions.remove(record)} />
            </div>
          )}
        </>
      )}
    </article>
  )
}
