import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { dateFormat } from '../../core/journal/dates.ts'
import { additionsOf, applyAddition, historyOf, isCheck, qaOf } from '../../core/journal/records.ts'
import type { JournalRecord } from '../../core/store/types.ts'
import { lookAttributes, recordLook } from '../../core/theme/recordLook.ts'
import { ConfirmButton } from '../../ui/ConfirmButton.tsx'
import { AdditionEditor, EntryEditor } from './EntryEditor.tsx'
import { History } from './History.tsx'
import { RecordState } from './RecordState.tsx'

export interface RecordActions {
  /** Saves a changed record; resolves false (after telling the person) when it failed. */
  save: (record: JournalRecord, done: 'added' | 'edited') => Promise<boolean>
  remove: (record: JournalRecord) => void
  send: (record: JournalRecord) => void
  notify: (message: string) => void
}

interface CardProps {
  record: JournalRecord
  scale: string
  showLook?: boolean
  actions: RecordActions
}

/** A mood note without text. */
export function CheckCard({ record, scale, showLook, actions }: CardProps) {
  const { t, lang } = useI18n()
  const f = dateFormat(lang)
  return (
    <div class="card entry entry--check" {...lookAttributes(showLook ? recordLook(record) : null)}>
      <div class="entry__check-head">
        <span>{t('checkLbl')} · {f.day(record.ts)}, {f.time(record.ts)}</span>
        <ConfirmButton label={t('remove')} confirmLabel={t('removeConfirm')} class="link-btn entry__remove" onConfirm={() => actions.remove(record)} />
      </div>
      <RecordState record={record} scale={scale} />
    </div>
  )
}

type Mode = 'view' | 'edit' | 'add'

/** One entry in the Path: text clamped to a few lines, with a quiet menu of actions. */
export function EntryCard({ record, scale, showLook, actions }: CardProps) {
  const { t, lang } = useI18n()
  const f = dateFormat(lang)
  const [mode, setModeState] = useState<Mode>('view')
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  const hasHistory = historyOf(record).length > 0

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
    <article class="card entry" {...lookAttributes(showLook ? recordLook(record) : null)}>
      <div class="entry__head">
        <span>{f.date(record.ts)}, {f.time(record.ts)}</span>
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
              <p class="entry__text">{item.text}</p>
            </div>
          ))}
          {additionsOf(record).map((a) => (
            <div key={a.at}>
              <p class="entry__addition-meta">{t('addition')} · {f.day(a.at)}, {f.time(a.at)}</p>
              <p class="entry__text">{a.text}</p>
            </div>
          ))}
        </div>
      )}
      {historyOpen && <History record={record} />}
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
              <button type="button" class="link-btn" onClick={() => { setMenuOpen(false); actions.send(record) }}>{t('mSend')}</button>
              <ConfirmButton label={t('mDel')} confirmLabel={t('delConfirm')} onConfirm={() => actions.remove(record)} />
            </div>
          )}
        </>
      )}
    </article>
  )
}
