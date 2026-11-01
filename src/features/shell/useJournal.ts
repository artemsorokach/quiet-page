import { useEffect, useRef, useState } from 'preact/hooks'
import { saveTextFile } from '../../core/files/saveText.ts'
import type { Translator } from '../../core/i18n/I18nProvider.tsx'
import { UK_FEELINGS } from '../../core/i18n/ukFeelings.ts'
import { makeBackup, newRecords, parseBackup, BACKUP_SETTING_KEYS } from '../../core/journal/backup.ts'
import { asHtml } from '../../core/journal/exporting.ts'
import { isCheck } from '../../core/journal/records.ts'
import type { EntryStore, JournalRecord } from '../../core/store/types.ts'
import type { RecordActions } from '../path/EntryCard.tsx'
import type { BackupActions } from '../settings/DataSection.tsx'

const TOAST_MS = 2800
const stamp = () => new Date().toISOString().slice(0, 10)

function currentSettings(): Record<string, unknown> {
  const settings: Record<string, unknown> = {}
  for (const key of BACKUP_SETTING_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    try {
      settings[key] = JSON.parse(raw)
    } catch {
      settings[key] = raw
    }
  }
  return settings
}

/** Records of the current store, plus the actions screens take on them and a quiet toast. */
export function useJournal(store: EntryStore, i18n: Translator, scale: string) {
  const { t } = i18n
  const [records, setRecords] = useState<readonly JournalRecord[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => store.subscribe(setRecords), [store])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function notify(message: string) {
    setToast(message)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }

  async function saveFile(name: string, text: string, type: string) {
    try {
      if (await saveTextFile(name, text, type)) notify(t('fileReady'))
    } catch {
      notify(t('fileFail'))
    }
  }

  const recordActions: RecordActions = {
    notify,
    save: async (record, done) => {
      try {
        await store.put(record)
        notify(t(done === 'added' ? 'added' : done === 'restyled' ? 'lookSaved' : 'editedToast'))
        return true
      } catch {
        notify(t(done === 'added' ? 'addFail' : 'editFail'))
        return false
      }
    },
    remove: (record) => {
      const check = isCheck(record)
      store.remove(record.id).then(
        () => notify(t(check ? 'removed' : 'deleted')),
        () => notify(t(check ? 'removeFail' : 'delFail')),
      )
    },
    send: (record) => void saveFile(`quiet-page-${stamp()}.html`, asHtml([record], { i18n, ukFeelings: UK_FEELINGS, scale }), 'text/html'),
  }

  const backup: BackupActions = {
    save: async () => {
      await saveFile(`quiet-page-backup-${stamp()}.json`, makeBackup(records, currentSettings(), new Date()), 'application/json')
    },
    copy: async () => {
      try {
        await navigator.clipboard.writeText(makeBackup(records, currentSettings(), new Date()))
        notify(t('bkCopied', { n: records.length }))
      } catch {
        notify(t('copyFail'))
      }
    },
    importFile: async (file) => {
      try {
        const { entries, settings } = parseBackup(await file.text())
        if (settings['ts-myfeels']) localStorage.setItem('ts-myfeels', JSON.stringify(settings['ts-myfeels']))
        let count = 0
        for (const record of newRecords(records, entries)) {
          try {
            await store.put(record)
            count += 1
          } catch {
            // one broken record should not stop the rest
          }
        }
        notify(t('importDone', { n: count }))
      } catch {
        notify(t('importFail'))
      }
    },
  }

  return { records, toast, notify, saveFile, recordActions, backup }
}
