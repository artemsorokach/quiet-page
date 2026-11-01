import { useRef } from 'preact/hooks'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'

export interface BackupActions {
  save: () => Promise<void>
  copy: () => Promise<void>
  importFile: (file: File) => Promise<void>
}

interface DataSectionProps {
  hasRecords: boolean
  actions: BackupActions
}

/** Settings → «Дані»: a backup for oneself (save, copy) and restoring from one. */
export function DataSection({ hasRecords, actions }: DataSectionProps) {
  const { t } = useI18n()
  const input = useRef<HTMLInputElement>(null)
  return (
    <div class="settings__group settings__data">
      <p class="label">{t('dataLbl')}</p>
      <div class="settings__rows">
        <button type="button" class="settings__row" disabled={!hasRecords} onClick={() => void actions.save()}>
          <b>{t('bkSave')}</b>
          <span>{t('bkSaveHint')}</span>
        </button>
        <button type="button" class="settings__row" disabled={!hasRecords} onClick={() => void actions.copy()}>
          <b>{t('bkCopy')}</b>
          <span>{t('bkCopyHint')}</span>
        </button>
        <button type="button" class="settings__row" onClick={() => input.current?.click()}>
          <b>{t('importBtn')}</b>
          <span>{t('importHint')}</span>
        </button>
      </div>
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
      <p class="settings__hint">{t('bkWarn')}</p>
    </div>
  )
}
