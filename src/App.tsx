import { useState } from 'preact/hooks'
import { I18nProvider, useI18n, type Messages } from './core/i18n/I18nProvider.tsx'
import uk from './i18n/locales/uk.json'
import { AppHeader } from './features/shell/AppHeader.tsx'
import { TabNav, type Tab } from './features/shell/TabNav.tsx'
import { WriteScreen } from './features/write/WriteScreen.tsx'
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

function Shell() {
  const { messages, t } = useI18n()
  const [tab, setTab] = useState<Tab>('write')
  const [questionIndex, setQuestionIndex] = useState(2)
  const [showQuestion, setShowQuestion] = useState(true)
  const [supportOpen, setSupportOpen] = useState(false)
  const question = showQuestion ? (messages.prompts[questionIndex % messages.prompts.length] ?? null) : null

  return (
    <div class="app">
      <AppHeader
        appName={t('appName')}
        settingsLabel={t('settingsBtn')}
        onOpenSettings={() => undefined}
      />
      <TabNav
        current={tab}
        navLabel={t('navLabel')}
        labels={{ write: t('tWrite'), path: t('tPath'), share: t('tShare') }}
        onSelect={setTab}
      />
      <main>
        <WriteScreen
          date={new Date()}
          greeting={messages.greets[5] ?? ''}
          question={question}
          onNextQuestion={() => setQuestionIndex((i) => i + 1)}
          onToggleQuestion={() => setShowQuestion((v) => !v)}
          onOpenSupport={() => setSupportOpen(true)}
        />
      </main>
      <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  )
}
