import { useState } from 'preact/hooks'
import { WrongSecretError } from '../../core/crypto/errors.ts'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { Button } from '../../ui/Button.tsx'
import { AccountLayout, Field } from './AccountLayout.tsx'

export type SecurityMode = 'password' | 'code' | 'delete'

interface SecurityScreenProps {
  mode: SecurityMode
  onChangePassword: (current: string, next: string) => Promise<void>
  onNewCode: (current: string) => Promise<void>
  onDone: (message?: string) => void
}

const MIN_PASSWORD = 6

/** From Settings: a new entries password or a new recovery code — both need the current password. */
export function SecurityScreen({ mode, onChangePassword, onNewCode, onDone }: SecurityScreenProps) {
  const { t } = useI18n()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!current) return setMessage(t('keyWrong'))
    if (mode === 'password') {
      if (next.length < MIN_PASSWORD) return setMessage(t('keyShort'))
      if (next !== repeat) return setMessage(t('keyMismatch'))
    }
    setBusy(true)
    setMessage(t('keyWorking'))
    try {
      if (mode === 'password') {
        await onChangePassword(current, next)
        onDone(t('pwChanged'))
      } else await onNewCode(current)
    } catch (error) {
      setMessage(error instanceof WrongSecretError ? t('keyWrong') : t('netErr'))
      setBusy(false)
    }
  }

  return (
    <AccountLayout title={mode === 'password' ? t('chPass') : t('newCode')} lead={mode === 'code' ? t('rcAskLead') : undefined}>
      <form
        class="account__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field id="sec-current" type="password" label={t('keyOld')} value={current} autoComplete="current-password" onInput={setCurrent} />
        {mode === 'password' && (
          <>
            <Field id="sec-new" type="password" label={t('keyNew')} value={next} autoComplete="new-password" onInput={setNext} />
            <Field id="sec-repeat" type="password" label={t('keyPass2')} value={repeat} autoComplete="new-password" onInput={setRepeat} />
          </>
        )}
        <div class="account__actions">
          <Button type="submit" disabled={busy}>{mode === 'password' ? t('saveChanges') : t('rcMake')}</Button>
          <Button variant="ghost" disabled={busy} onClick={() => onDone()}>{t('cancel')}</Button>
        </div>
      </form>
      <p class="account__message" role="status">{message}</p>
    </AccountLayout>
  )
}
