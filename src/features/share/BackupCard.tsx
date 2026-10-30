import { useRef } from 'preact/hooks'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import type { JournalRecord } from '../../core/store/types.ts'
import { Button } from '../../ui/Button.tsx'

export interface BackupActions {
  save: () => Promise<void>
  copy: () => Promise<void>
  importFile: (file: File) => Promise<void>
}

/** Everything in one unencrypted file, to keep for oneself; and bringing such a file back. */
export function BackupCard({ records, actions }: { records: readonly JournalRecord[]; actions: BackupActions }) {
  const { t } = useI18n()
  const input = useRef<HTMLInputElement>(null)
  return (
    <div class="card share__backup">
      <p class="label">{t('bkLbl')}</p>
      <p class="share__hint">{t('bkHint')}</p>
      <div class="share__actions share__actions--start">
        <Button variant="ghost" disabled={!records.length} onClick={actions.save}>{t('bkSave')}</Button>
        <Button variant="ghost" disabled={!records.length} onClick={actions.copy}>{t('bkCopy')}</Button>
        <Button variant="ghost" onClick={() => input.current?.click()}>{t('importBtn')}</Button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const el = e.currentTarget
            const file = el.files?.[0]
            el.value = ''
            if (file) void actions.importFile(file)
          }}
        />
      </div>
    </div>
  )
}
