import { useState } from 'preact/hooks'
import { saveTextFile } from '../../core/files/saveText.ts'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { Button } from '../../ui/Button.tsx'
import { AccountLayout } from './AccountLayout.tsx'

interface RecoveryCodeScreenProps {
  code: string
  email: string
  onDone: () => void
}

/** Shows the recovery code once, with calm ways to keep it. */
export function RecoveryCodeScreen({ code, email, onDone }: RecoveryCodeScreenProps) {
  const { t } = useI18n()
  const [message, setMessage] = useState('')
  const groups = code.split('-')

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setMessage(t('rcCopied'))
    } catch {
      setMessage(t('copyFail'))
    }
  }

  const mailHref = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(t('rcMailSubj'))}&body=${encodeURIComponent(`${t('rcMailBody')}\n\n${code}\n`)}`

  return (
    <AccountLayout title={t('rcTitle')} lead={t('rcLead')}>
      <p class="account__code" aria-label={code}>
        {groups.map((group, i) => (
          <span key={i}>{group + (i < groups.length - 1 ? '-' : '')}</span>
        ))}
      </p>
      <p class="account__note">{t('rcKeep')}</p>
      <div class="account__actions">
        <Button variant="ghost" onClick={copy}>{t('rcCopy')}</Button>
        <Button variant="ghost" onClick={() => saveTextFile('quiet-page-recovery-code.txt', `${t('rcFile')}\n\n${code}\n\n${email}\n`)}>
          {t('rcSave')}
        </Button>
        <a class="btn btn--ghost account__mail" href={mailHref}>{t('rcMail')}</a>
      </div>
      <p class="account__message" role="status">{message}</p>
      <div class="account__actions">
        <Button onClick={onDone}>{t('rcDone')}</Button>
      </div>
    </AccountLayout>
  )
}
