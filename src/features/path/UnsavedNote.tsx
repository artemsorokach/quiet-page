import { useI18n } from '../../core/i18n/I18nProvider.tsx'

interface UnsavedNoteProps {
  /** true when there is text, false when only the state and feelings were chosen */
  hasText: boolean
  onSave: () => void
  onBack: () => void
}

/** On the Path: «Сторінка» still holds something that was never saved. */
export function UnsavedNote({ hasText, onSave, onBack }: UnsavedNoteProps) {
  const { t } = useI18n()
  return (
    <div class="unsaved" role="status">
      <p>{t(hasText ? 'unsavedText' : 'unsavedState')}</p>
      <div class="unsaved__actions">
        <button type="button" class="btn btn--primary unsaved__save" onClick={onSave}>{t('saveNow')}</button>
        <button type="button" class="link-btn" onClick={onBack}>{t('backToPage')}</button>
      </div>
    </div>
  )
}
