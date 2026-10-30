import { useState } from 'preact/hooks'
import { I18nProvider, useI18n, type Messages } from './core/i18n/I18nProvider.tsx'
import uk from './i18n/locales/uk.json'
import { AuthScreen } from './features/account/AuthScreen.tsx'
import { KeyScreen } from './features/account/KeyScreen.tsx'
import { RecoveryCodeScreen } from './features/account/RecoveryCodeScreen.tsx'
import { useAccount } from './features/account/useAccount.ts'
import { AppHeader } from './features/shell/AppHeader.tsx'
import { TabNav, type Tab } from './features/shell/TabNav.tsx'
import { WriteScreen, type SaveResult } from './features/write/WriteScreen.tsx'
import { composeRecord, newRecordId, type WriteForm } from './features/write/composeRecord.ts'
import { SupportSheet } from './features/support/SupportSheet.tsx'
import './styles/global.css'
import './App.css'

export function App() {
  return (
    <I18nProvider lang="uk" messages={uk as Messages}>
      <Shell />
    </I18nProvider>
  )
}

function pickGreeting(greetings: readonly string[], date: Date): string {
  return greetings[date.getDate() % greetings.length] ?? ''
}

function Shell() {
  const { lang, messages, t } = useI18n()
  const account = useAccount(lang)
  const { phase, store } = account
  const [tab, setTab] = useState<Tab>('write')
  const [questionIndex, setQuestionIndex] = useState(() => new Date().getDate() % messages.prompts.length)
  const [showQuestion, setShowQuestion] = useState(true)
  const [supportOpen, setSupportOpen] = useState(false)
  const today = new Date()
  const index = questionIndex % messages.prompts.length
  const questionText = messages.prompts[index]
  const question = showQuestion && questionText ? { text: questionText, index } : null

  async function save(form: WriteForm): Promise<SaveResult> {
    const now = Date.now()
    const record = composeRecord(form, newRecordId(now), now)
    if (!record) return 'failed'
    try {
      await store.put(record)
      setQuestionIndex((i) => i + 1)
      return 'saved'
    } catch {
      return 'failed'
    }
  }

  if (phase.kind === 'signIn') {
    return (
      <div class="app">
        <AuthScreen actions={account.authActions} errorMessage={(error) => t(account.authErrorKey(error))} onBack={account.backToLocal} />
      </div>
    )
  }
  if (phase.kind === 'key') {
    return (
      <div class="app">
        <KeyScreen
          mode={phase.mode}
          email={account.email}
          canRecover={account.canRecover}
          actions={account.keyActions}
          onModeChange={account.setKeyMode}
        />
      </div>
    )
  }
  if (phase.kind === 'code') {
    return (
      <div class="app">
        <RecoveryCodeScreen code={phase.code} email={account.email} onDone={account.finishCode} />
      </div>
    )
  }

  return (
    <div class="app">
      <AppHeader appName={t('appName')} settingsLabel={t('settingsBtn')} onOpenSettings={() => undefined} />
      <TabNav
        current={tab}
        navLabel={t('navLabel')}
        labels={{ write: t('tWrite'), path: t('tPath'), share: t('tShare') }}
        onSelect={setTab}
      />
      <main>
        <WriteScreen
          date={today}
          greeting={pickGreeting(messages.greets, today)}
          question={question}
          scale="vaha"
          localOnly={phase.kind !== 'cloud'}
          onNextQuestion={() => setQuestionIndex((i) => i + 1)}
          onToggleQuestion={() => setShowQuestion((v) => !v)}
          onOpenSupport={() => setSupportOpen(true)}
          onSignIn={account.showSignIn}
          onSave={save}
        />
      </main>
      <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  )
}
