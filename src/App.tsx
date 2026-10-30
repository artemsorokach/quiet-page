import { useMemo, useState } from 'preact/hooks'
import { I18nProvider, useI18n, type Messages } from './core/i18n/I18nProvider.tsx'
import uk from './i18n/locales/uk.json'
import { LocalEntryStore } from './core/store/localStore.ts'
import type { EntryStore } from './core/store/types.ts'
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
  const { messages, t } = useI18n()
  const store: EntryStore = useMemo(() => new LocalEntryStore(localStorage), [])
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
          localOnly
          onNextQuestion={() => setQuestionIndex((i) => i + 1)}
          onToggleQuestion={() => setShowQuestion((v) => !v)}
          onOpenSupport={() => setSupportOpen(true)}
          onSignIn={() => undefined}
          onSave={save}
        />
      </main>
      <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  )
}
