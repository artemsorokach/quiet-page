import { useState } from 'preact/hooks'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { dateFormat } from '../../core/journal/dates.ts'
import { additionsOf, applyEdit, qaOf } from '../../core/journal/records.ts'
import type { JournalRecord } from '../../core/store/types.ts'
import { GrowingTextarea } from '../../ui/GrowingTextarea.tsx'
import { Button } from '../../ui/Button.tsx'

interface EditorProps {
  record: JournalRecord
  onSave: (next: JournalRecord) => Promise<boolean>
  onCancel: () => void
  onEmpty: () => void
}

/** Correcting an entry's text; the earlier version is kept in its history. */
export function EntryEditor({ record, onSave, onCancel, onEmpty }: EditorProps) {
  const { t, lang } = useI18n()
  const f = dateFormat(lang)
  const qa = qaOf(record)
  const adds = additionsOf(record)
  const [answers, setAnswers] = useState(() => qa.map((item) => item.text))
  const [addTexts, setAddTexts] = useState(() => adds.map((a) => a.text))
  const [busy, setBusy] = useState(false)

  async function save() {
    const nextQa = qa.map((item, i) => ({ ...item, text: (answers[i] ?? '').trim() }))
    const nextAdds = adds.map((a, i) => ({ at: a.at, text: (addTexts[i] ?? '').trim() }))
    const unchanged = nextQa.every((item, i) => item.text === qa[i]?.text) && nextAdds.every((a, i) => a.text === adds[i]?.text)
    if (unchanged) return onCancel()
    if (!nextQa.some((item) => item.text) && !nextAdds.some((a) => a.text)) return onEmpty()
    setBusy(true)
    const ok = await onSave(applyEdit(record, nextQa, nextAdds, Date.now()))
    setBusy(false)
    if (ok) onCancel()
  }

  return (
    <div class="entry__editor">
      {qa.map((item, i) => (
        <label key={`q${i}`} class="entry__edit-block">
          <span class="entry__question">{item.prompt ?? t('free')}</span>
          <GrowingTextarea
            class="entry__textarea"
            value={answers[i] ?? ''}
            onInput={(e) => setAnswers(answers.map((v, k) => (k === i ? (e.currentTarget as HTMLTextAreaElement).value : v)))}
          />
        </label>
      ))}
      {adds.map((a, i) => (
        <label key={`a${a.at}`} class="entry__edit-block">
          <span class="entry__addition-meta">{t('addition')} · {f.day(a.at)}, {f.time(a.at)}</span>
          <GrowingTextarea
            class="entry__textarea"
            value={addTexts[i] ?? ''}
            onInput={(e) => setAddTexts(addTexts.map((v, k) => (k === i ? (e.currentTarget as HTMLTextAreaElement).value : v)))}
          />
        </label>
      ))}
      <div class="entry__editor-actions">
        <Button disabled={busy} onClick={save}>{t('saveChanges')}</Button>
        <button type="button" class="chip" onClick={onCancel}>{t('cancel')}</button>
      </div>
      <p class="entry__hint">{t('editHint')}</p>
    </div>
  )
}

interface AdditionProps {
  onAdd: (text: string) => Promise<boolean>
  onCancel: () => void
}

/** Adding a few lines to an entry later; the original text stays as it was. */
export function AdditionEditor({ onAdd, onCancel }: AdditionProps) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  async function add() {
    const value = text.trim()
    if (!value) return onCancel()
    setBusy(true)
    const ok = await onAdd(value)
    setBusy(false)
    if (ok) onCancel()
  }
  return (
    <div class="entry__editor">
      <label class="entry__edit-block">
        <span class="entry__addition-meta">{t('addition')} · {t('now')}</span>
        <GrowingTextarea
          class="entry__textarea"
          value={text}
          placeholder={t('addPh')}
          focusOnMount
          onInput={(e) => setText((e.currentTarget as HTMLTextAreaElement).value)}
        />
      </label>
      <div class="entry__editor-actions">
        <Button disabled={busy} onClick={add}>{t('addBtn')}</Button>
        <button type="button" class="chip" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </div>
  )
}
