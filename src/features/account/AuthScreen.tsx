import { useState } from 'preact/hooks'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { Button } from '../../ui/Button.tsx'
import { AccountLayout, Field } from './AccountLayout.tsx'

export interface AuthActions {
  google: () => Promise<void>
  email: (email: string, password: string, isNew: boolean) => Promise<void>
  reset: (email: string) => Promise<void>
}

interface AuthScreenProps {
  actions: AuthActions
  /** Turns an error into a message key */
  errorMessage: (error: unknown) => string
  onBack: () => void
}

/** Sign in with Google or e-mail. Entries stay readable only with the separate entries password. */
export function AuthScreen({ actions, errorMessage, onBack }: AuthScreenProps) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function attempt(action: () => Promise<void>, done?: string) {
    setBusy(true)
    setMessage('')
    try {
      await action()
      if (done) setMessage(done)
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccountLayout title={t('authTitle')} lead={t('authLead')}>
      <Button variant="ghost" disabled={busy} onClick={() => attempt(actions.google)}>{t('authGoogle')}</Button>
      <p class="account__or">{t('authOr')}</p>
      <form
        class="account__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void attempt(() => actions.email(email.trim(), password, false))
        }}
      >
        <Field id="auth-email" type="email" label={t('authEmail')} value={email} autoComplete="email" onInput={setEmail} />
        <Field id="auth-pass" type="password" label={t('authPassApp')} hint={t('authPassHint')} value={password} autoComplete="current-password" onInput={setPassword} />
        <div class="account__actions">
          <Button type="submit" disabled={busy}>{t('authSignIn')}</Button>
          <Button variant="ghost" disabled={busy} onClick={() => attempt(() => actions.email(email.trim(), password, true))}>
            {t('authSignUp')}
          </Button>
        </div>
      </form>
      <p class="account__after">{t('authSecondPw')}</p>
      <p class="account__message" role="status">{message}</p>
      <div class="account__links">
        <Button
          variant="quiet"
          onClick={() => (email.trim() ? attempt(() => actions.reset(email.trim()), t('authResetSent')) : setMessage(t('errEmail')))}
        >
          {t('authForgot')}
        </Button>
        <Button variant="quiet" onClick={onBack}>{t('authBack')}</Button>
      </div>
      <p class="account__footer">{t('authLocalHint')}</p>
    </AccountLayout>
  )
}
