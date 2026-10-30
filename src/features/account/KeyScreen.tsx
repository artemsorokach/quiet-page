import { useEffect, useState } from 'preact/hooks'
import { WrongSecretError } from '../../core/crypto/errors.ts'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { Button } from '../../ui/Button.tsx'
import { AccountLayout, Field } from './AccountLayout.tsx'

export type KeyMode = 'new' | 'open' | 'recover' | 'setpw' | 'pwdone' | 'lost' | 'offline'

export interface KeyActions {
  create: (password: string) => Promise<void>
  open: (password: string) => Promise<void>
  recover: (code: string) => Promise<void>
  setPassword: (password: string) => Promise<void>
  newCode: () => Promise<void>
  continueAfterPassword: () => void
  startOver: () => Promise<void>
  retry: () => void
  signOut: () => void
}

interface KeyScreenProps {
  mode: KeyMode
  email: string
  canRecover: boolean
  actions: KeyActions
  onModeChange: (mode: KeyMode) => void
}

const MIN_PASSWORD = 6

const COPY = {
  new: ['keyNewTitle', 'keyNewLead', 'keyWarn', 'keyCreate'],
  open: ['keyOpenTitle', 'keyOpenLead', null, 'keyOpen'],
  recover: ['recTitle', 'recLead', null, 'recGo'],
  setpw: ['setTitle', 'setLead', null, 'keyCreate'],
  pwdone: ['pwDoneTitle', 'pwDoneLead', null, 'pwDoneGo'],
  lost: ['lostTitle', 'lostLead', 'lostDevice', 'lostReset'],
  offline: ['keyOpenTitle', 'netErr', null, 'retry'],
} as const

/** The entries password: create it, open with it, recover with the code, or start over. */
export function KeyScreen({ mode, email, canRecover, actions, onModeChange }: KeyScreenProps) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [title, lead, note, primary] = COPY[mode]
  const asksPassword = mode === 'new' || mode === 'open' || mode === 'setpw'
  const asksRepeat = mode === 'new' || mode === 'setpw'

  useEffect(() => {
    setPassword('')
    setRepeat('')
    setCode('')
    setMessage('')
    setConfirmReset(false)
  }, [mode])

  async function run(action: () => Promise<void>, wrongKey: 'keyWrong' | 'recWrong' = 'keyWrong') {
    setBusy(true)
    setMessage(t('keyWorking'))
    try {
      await action()
      setMessage('')
    } catch (error) {
      setMessage(error instanceof WrongSecretError ? t(wrongKey) : t('netErr'))
    } finally {
      setBusy(false)
    }
  }

  function submit() {
    if (asksRepeat) {
      if (password.length < MIN_PASSWORD) return setMessage(t('keyShort'))
      if (password !== repeat) return setMessage(t('keyMismatch'))
    }
    switch (mode) {
      case 'new':
        return void run(() => actions.create(password))
      case 'open':
        return password ? void run(() => actions.open(password)) : undefined
      case 'recover':
        return void run(() => actions.recover(code), 'recWrong')
      case 'setpw':
        return void run(() => actions.setPassword(password))
      case 'pwdone':
        return actions.continueAfterPassword()
      case 'offline':
        return actions.retry()
      case 'lost':
        if (!confirmReset) {
          setConfirmReset(true)
          return setMessage(t('lostConfirm'))
        }
        return void run(actions.startOver)
    }
  }

  return (
    <AccountLayout
      title={t(title)}
      lead={t(lead)}
      note={note ? t(note) : undefined}
      footer={
        <>
          <span>{email}</span>
          <Button variant="quiet" onClick={actions.signOut}>{t('signOut')}</Button>
        </>
      }
    >
      <form
        class="account__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        {asksPassword && (
          <Field
            id="key-pass"
            type="password"
            label={t(mode === 'setpw' ? 'keyNew' : 'keyPass')}
            value={password}
            autoComplete={mode === 'open' ? 'current-password' : 'new-password'}
            onInput={setPassword}
          />
        )}
        {asksRepeat && (
          <Field id="key-pass2" type="password" label={t('keyPass2')} value={repeat} autoComplete="new-password" onInput={setRepeat} />
        )}
        {mode === 'recover' && <Field id="key-code" label={t('recCode')} value={code} autoComplete="off" code onInput={setCode} />}
        <div class="account__actions">
          <Button type="submit" variant={mode === 'lost' ? 'ghost' : 'primary'} disabled={busy}>
            {mode === 'lost' && confirmReset ? t('lostYes') : t(primary)}
          </Button>
          {mode === 'pwdone' && (
            <Button variant="ghost" disabled={busy} onClick={() => run(actions.newCode)}>{t('pwDoneNew')}</Button>
          )}
          {mode === 'lost' && (
            <Button variant="ghost" onClick={() => onModeChange(canRecover ? 'recover' : 'open')}>{t('authBack')}</Button>
          )}
        </div>
      </form>
      <p class="account__message" role="status">{message}</p>
      <div class="account__links">
        {mode === 'open' && (
          <Button variant="quiet" onClick={() => onModeChange(canRecover ? 'recover' : 'lost')}>{t('keyForgot')}</Button>
        )}
        {mode === 'recover' && (
          <>
            <Button variant="quiet" onClick={() => onModeChange('open')}>{t('recBack')}</Button>
            <Button variant="quiet" onClick={() => onModeChange('lost')}>{t('recNone')}</Button>
          </>
        )}
      </div>
    </AccountLayout>
  )
}
