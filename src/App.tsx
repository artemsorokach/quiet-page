import { useState } from 'preact/hooks'
import { I18nProvider, useI18n } from './core/i18n/I18nProvider.tsx'
import { writeSetting } from './core/settings/storage.ts'
import { MemoryEntryStore } from './core/store/memoryStore.ts'
import { readFlag, resolvedMode } from './core/theme/theme.ts'
import { AuthScreen } from './features/account/AuthScreen.tsx'
import { KeyScreen } from './features/account/KeyScreen.tsx'
import { RecoveryCodeScreen } from './features/account/RecoveryCodeScreen.tsx'
import { SecurityScreen } from './features/account/SecurityScreen.tsx'
import { useAccount } from './features/account/useAccount.ts'
import { PathScreen } from './features/path/PathScreen.tsx'
import { SettingsSheet } from './features/settings/SettingsSheet.tsx'
import { ShareScreen, type ShareRequest } from './features/share/ShareScreen.tsx'
import { AppHeader } from './features/shell/AppHeader.tsx'
import { TabNav, type Tab } from './features/shell/TabNav.tsx'
import { useJournal } from './features/shell/useJournal.ts'
import { usePreferences } from './features/shell/usePreferences.ts'
import { SupportSheet } from './features/support/SupportSheet.tsx'
import { WelcomeScreen } from './features/welcome/WelcomeScreen.tsx'
import { sampleRecords } from './features/welcome/demo.ts'
import { WriteScreen, type SaveResult } from './features/write/WriteScreen.tsx'
import { composeRecord, newRecordId, type WriteForm } from './features/write/composeRecord.ts'
import { Toast } from './ui/Toast.tsx'
import { HeartHandIcon } from './ui/icons.tsx'
import './styles/global.css'
import './App.css'

export function App() {
  const prefs = usePreferences()
  if (!prefs.messages) return null
  return (
    <I18nProvider lang={prefs.lang} messages={prefs.messages}>
      <div class="atmo-light" aria-hidden="true" />
      <Shell prefs={prefs} />
    </I18nProvider>
  )
}

type Preferences = ReturnType<typeof usePreferences>

function pickGreeting(greetings: readonly string[], date: Date): string {
  return greetings[date.getDate() % greetings.length] ?? ''
}

function Shell({ prefs }: { prefs: Preferences }) {
  const { theme, look, scale, setTheme: onTheme, setLook: onLook, setScale: onScale, setLang: onLang } = prefs
  const i18n = useI18n()
  const { lang, messages, t } = i18n
  const account = useAccount(lang)
  const { phase } = account
  const [welcome, setWelcome] = useState(() => !readFlag('ts-welcomed'))
  const [demo, setDemo] = useState<MemoryEntryStore | null>(null)
  const store = demo ?? account.store
  const journal = useJournal(store, i18n, scale)
  const [tab, setTab] = useState<Tab>('write')
  const [questionIndex, setQuestionIndex] = useState(() => new Date().getDate() % messages.prompts.length)
  const [showQuestion, setShowQuestion] = useState(true)
  const [supportOpen, setSupportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shareRequest, setShareRequest] = useState<ShareRequest | null>(null)
  const today = new Date()
  const index = questionIndex % messages.prompts.length
  const questionText = messages.prompts[index]
  const question = showQuestion && questionText ? { text: questionText, index } : null
  const scaleWords = (messages.scales as unknown as Record<string, readonly [string, readonly string[]]>)[scale]?.[1] ?? []

  function selectTab(next: Tab) {
    setTab(next)
    window.scrollTo(0, 0)
  }

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

  function closeWelcome() {
    writeSetting('ts-welcomed', true)
    setWelcome(false)
    window.scrollTo(0, 0)
  }

  if (welcome) {
    return (
      <div class="app">
        <WelcomeScreen
          returning={readFlag('ts-welcomed')}
          darkNow={resolvedMode(theme.mode) === 'dark'}
          onToggleDark={() => onTheme({ ...theme, mode: resolvedMode(theme.mode) === 'dark' ? 'light' : 'dark' })}
          onLang={onLang}
          onStart={() => {
            setDemo(null)
            setTab('write')
            closeWelcome()
          }}
          onDemo={() => {
            setDemo(new MemoryEntryStore(sampleRecords(messages, lang, Date.now())))
            setWelcome(false)
            selectTab('write')
          }}
          onSupport={() => setSupportOpen(true)}
        />
        <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
      </div>
    )
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
        <KeyScreen mode={phase.mode} email={account.email} canRecover={account.canRecover} actions={account.keyActions} onModeChange={account.setKeyMode} />
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
  if (phase.kind === 'security') {
    return (
      <div class="app">
        <SecurityScreen
          mode={phase.mode}
          onChangePassword={account.security.changePassword}
          onNewCode={account.security.newCode}
          onDone={(message) => {
            account.security.close()
            if (message) journal.notify(message)
          }}
        />
      </div>
    )
  }

  const inCloud = phase.kind === 'cloud'
  return (
    <div class="app">
      {demo && (
        <p class="demo-bar" role="status">
          <span>{t('demoBar')}</span>
          <button
            type="button"
            class="link-btn"
            onClick={() => {
              setDemo(null)
              if (!readFlag('ts-welcomed')) setWelcome(true)
            }}
          >
            {t('demoExit')}
          </button>
        </p>
      )}
      <div class="app__chrome recede">
        <AppHeader appName={t('appName')} settingsLabel={t('settingsBtn')} onBrand={() => setWelcome(true)} onOpenSettings={() => setSettingsOpen(true)} />
        <TabNav current={tab} navLabel={t('navLabel')} labels={{ write: t('tWrite'), path: t('tPath'), share: t('tShare') }} onSelect={selectTab} />
      </div>
      <main>
        {tab === 'write' && (
          <WriteScreen
            date={today}
            greeting={pickGreeting(messages.greets, today)}
            question={question}
            scale={scale}
            localOnly={!inCloud && !demo}
            focusMode={look.focus}
            onNextQuestion={() => setQuestionIndex((i) => i + 1)}
            onToggleQuestion={() => setShowQuestion((v) => !v)}
            onOpenSupport={() => setSupportOpen(true)}
            onSignIn={account.showSignIn}
            onSave={save}
          />
        )}
        {tab === 'path' && (
          <PathScreen
            records={journal.records}
            scale={scale}
            scaleWords={scaleWords}
            actions={journal.recordActions}
            onSendDay={(day) => {
              setShareRequest({ days: [day], nonce: Date.now() })
              selectTab('share')
            }}
          />
        )}
        {tab === 'share' && (
          <ShareScreen
            records={journal.records}
            scale={scale}
            request={shareRequest}
            backup={journal.backup}
            saveFile={journal.saveFile}
            notify={journal.notify}
          />
        )}
      </main>
      {tab !== 'write' && (
        <button type="button" class="write__support app__support" onClick={() => setSupportOpen(true)}>
          <HeartHandIcon />
          {t('supportLink')}
        </button>
      )}
      <footer class="app-foot recede">
        <p>Quiet Page · {t('beta')}</p>
        <p>{t('freeNote')}</p>
        <p class="app-foot__ideas">{t('feedbackShort')}</p>
        <button type="button" class="link-btn" onClick={() => setWelcome(true)}>{t('about')}</button>
      </footer>
      <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
      <SettingsSheet
        open={settingsOpen}
        theme={theme}
        look={look}
        scale={scale}
        account={
          inCloud && !demo
            ? {
                email: account.email,
                askEveryTime: account.security.askEveryTime,
                onAskEveryTime: (on) => void account.security.setAskEveryTime(on),
                onChangePassword: () => {
                  setSettingsOpen(false)
                  account.security.open('password')
                },
                onNewCode: () => {
                  setSettingsOpen(false)
                  account.security.open('code')
                },
                onSignOut: () => {
                  setSettingsOpen(false)
                  account.keyActions.signOut()
                },
              }
            : null
        }
        onTheme={onTheme}
        onLook={onLook}
        onScale={onScale}
        onLang={onLang}
        onSignIn={() => {
          setSettingsOpen(false)
          account.showSignIn()
        }}
        onClose={() => setSettingsOpen(false)}
      />
      <Toast message={journal.toast} />
    </div>
  )
}
