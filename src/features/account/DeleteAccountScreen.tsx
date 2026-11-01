import { useState } from 'preact/hooks'
import { WrongSecretError } from '../../core/crypto/errors.ts'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { Button } from '../../ui/Button.tsx'
import { AccountLayout, Field } from './AccountLayout.tsx'

interface DeleteAccountScreenProps {
  signInMethod: 'google' | 'password'
  onDelete: (entriesPassword: string, loginPassword: string) => Promise<'done' | 'partial'>
  /** maps a sign-in error to a message key */
  authErrorKey: (error: unknown) => 'errCred' | 'errExists' | 'errWeak' | 'errEmail' | 'errAuth'
  onDeleted: (result: 'done' | 'partial') => void
  onCancel: () => void
}

/** Settings → «Видалити акаунт і всі записи»: asks for the passwords, then removes everything. */
export function DeleteAccountScreen({ signInMethod, onDelete, authErrorKey, onDeleted, onCancel }: DeleteAccountScreenProps) {
  const { t } = useI18n()
  const [entriesPassword, setEntriesPassword] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const needsLogin = signInMethod === 'password'

  async function submit() {
    if (!entriesPassword) return setMessage(t('keyWrong'))
    if (needsLogin && !loginPassword) return setMessage(t('errCred'))
    setBusy(true)
    setMessage(t('keyWorking'))
    try {
      onDeleted(await onDelete(entriesPassword, loginPassword))
    } catch (error) {
      setMessage(errorMessage(error))
      setBusy(false)
    }
  }

  function errorMessage(error: unknown): string {
    if (error instanceof WrongSecretError) return t('keyWrong')
    const code = String((error as { code?: unknown })?.code ?? '')
    if (/popup-closed|cancelled-popup|popup-blocked/.test(code)) return t('delGoogleCancelled')
    if (code.startsWith('auth/')) return t(authErrorKey(error))
    return t('netErr')
  }

  return (
    <AccountLayout title={t('delTitle')} lead={t('delLead')} note={t('delBackupNote')}>
      <form
        class="account__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field id="del-entries" type="password" label={t('keyPass')} value={entriesPassword} autoComplete="current-password" onInput={setEntriesPassword} />
        {needsLogin && (
          <Field id="del-login" type="password" label={t('delLoginPw')} value={loginPassword} autoComplete="current-password" onInput={setLoginPassword} />
        )}
        <p class="account__hint">{needsLogin ? t('delLoginHint') : t('delGoogleHint')}</p>
        <div class="account__actions">
          <Button type="submit" variant="danger" disabled={busy}>{t('delAccConfirm')}</Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>{t('cancel')}</Button>
        </div>
      </form>
      <p class="account__message" role="status">{message}</p>
    </AccountLayout>
  )
}
