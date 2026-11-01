import { useEffect, useLayoutEffect, useState } from 'preact/hooks'
import { I18nProvider, useI18n } from './core/i18n/I18nProvider.tsx'
import { writeSetting } from './core/settings/storage.ts'
import { MemoryEntryStore } from './core/store/memoryStore.ts'
import { readFlag, resolvedMode } from './core/theme/theme.ts'
import { AuthScreen } from './features/account/AuthScreen.tsx'
import { KeyScreen } from './features/account/KeyScreen.tsx'
import { DeleteAccountScreen } from './features/account/DeleteAccountScreen.tsx'
import { RecoveryCodeScreen } from './features/account/RecoveryCodeScreen.tsx'
import { SecurityScreen } from './features/account/SecurityScreen.tsx'
import { useAccount } from './features/account/useAccount.ts'
import { useRevealOnScroll } from './features/shell/useRevealOnScroll.ts'
import { LegalSheet } from './features/legal/LegalSheet.tsx'
import { PathScreen } from './features/path/PathScreen.tsx'
import { UnsavedNote } from './features/path/UnsavedNote.tsx'
import { isEmptyDraft } from './core/draft/draft.ts'
import { SettingsSheet } from './features/settings/SettingsSheet.tsx'
import { ShareScreen, type ShareRequest } from './features/share/ShareScreen.tsx'
import { AppHeader } from './features/shell/AppHeader.tsx'
import { TabNav, type Tab } from './features/shell/TabNav.tsx'
import { useJournal } from './features/shell/useJournal.ts'
import { useSwipeTabs } from './features/shell/useSwipeTabs.ts'
import { useDraft } from './features/write/useDraft.ts'
import { useOwnFeelings } from './features/write/useOwnFeelings.ts'
import { usePreferences } from './features/shell/usePreferences.ts'
import { SupportSheet } from './features/support/SupportSheet.tsx'
import { WelcomeScreen } from './features/welcome/WelcomeScreen.tsx'
import { sampleRecords } from './features/welcome/demo.ts'
import { WriteScreen, type SaveResult } from './features/write/WriteScreen.tsx'
import { composeRecord, newRecordId, type WriteForm } from './features/write/composeRecord.ts'
import { Toast } from './ui/Toast.tsx'
import { SupportIcon } from './ui/icons.tsx'
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
  const [legalOpen, setLegalOpen] = useState(false)
  /** which side the new tab floats in from; null on first show */
  const footRef = useRevealOnScroll<HTMLElement>()
  /** re-renders the Path after saving from its «незбережене» note */
  const [, setUnsavedTick] = useState(0)
  const [tabMotion, setTabMotion] = useState<'next' | 'prev' | null>(null)
  const [showQuestion, setShowQuestion] = useState(true)
  const [supportOpen, setSupportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shareRequest, setShareRequest] = useState<ShareRequest | null>(null)
  const today = new Date()
  const index = questionIndex % messages.prompts.length
  const questionText = messages.prompts[index]
  const question = showQuestion && questionText ? { text: questionText, index } : null
  // While the app is starting the page is already usable, so it starts with this browser's draft.
  const draftScope = demo ? null : phase.kind === 'cloud' && account.uid ? `u:${account.uid}` : 'local'
  const draft = useDraft(draftScope)
  const own = useOwnFeelings(journal.records, messages.feelings)
  const [aboutOpen, setAboutOpen] = useState(false)
  const inApp = !welcome && (phase.kind === 'local' || phase.kind === 'cloud')

  // Before the first paint, so the welcome page never flashes at the old scroll position.
  // Opening or leaving the welcome page always starts at the top (also «Подивитися приклад»).
  useLayoutEffect(() => {
    if (welcome) setAboutOpen(false)
    window.scrollTo(0, 0)
  }, [welcome])

  // Every account step (sign-in, entries password, recovery code, security) opens at its top,
  // wherever on the page the person tapped «Увійти».
  const step = `${phase.kind}:${'mode' in phase ? phase.mode : ''}`
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  // «Про додаток» opens and the page glides down so its text is in view.
  useEffect(() => {
    if (!aboutOpen) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }))
  }, [aboutOpen])

  useEffect(() => {
    const notice = takeNotice()
    if (notice) journal.notify(notice)
  }, [])

  useEffect(() => {
    if (!draft.ready) return
    const q = draft.current().question
    if (q !== null) {
      setQuestionIndex(q)
      setShowQuestion(true)
    }
  }, [draft.ready, draftScope])

  useEffect(() => {
    if (draft.ready) draft.update({ question: showQuestion ? questionIndex % messages.prompts.length : null })
  }, [draft.ready, questionIndex, showQuestion])

  useSwipeTabs(inApp && !settingsOpen && !supportOpen && !legalOpen, (direction) => {
    const order: Tab[] = ['write', 'path', 'share']
    const next = order[order.indexOf(tab) + (direction === 'next' ? 1 : -1)]
    if (next) selectTab(next)
  })

  const scaleWords = (messages.scales as unknown as Record<string, readonly [string, readonly string[]]>)[scale]?.[1] ?? []

  function selectTab(next: Tab) {
    if (next === tab) return
    const order: Tab[] = ['write', 'path', 'share']
    setTabMotion(order.indexOf(next) > order.indexOf(tab) ? 'next' : 'prev')
    setTab(next)
    window.scrollTo(0, 0)
  }

  async function save(form: WriteForm): Promise<SaveResult> {
    const now = Date.now()
    const writtenIn = { skin: theme.skin, mode: resolvedMode(theme.mode), font: look.font }
    const record = composeRecord({ ...form, look: writtenIn }, newRecordId(now), now)
    if (!record) return 'failed'
    try {
      await store.put(record)
      draft.clear()
      setQuestionIndex((i) => i + 1)
      return 'saved'
    } catch {
      return 'failed'
    }
  }

  /** What «Сторінка» still holds, as a form to save straight from the Path. */
  function draftForm(): WriteForm {
    const d = draft.current()
    const text = d.question !== null ? messages.prompts[d.question % messages.prompts.length] : undefined
    return {
      mood: d.mood, scale, feelings: d.feelings, answer: d.answer, free: d.free, lang,
      question: text ? { text, index: d.question ?? 0 } : null,
    }
  }

  function unsavedNote() {
    const d = draft.current()
    if (!draft.ready || isEmptyDraft(d)) return null
    return (
      <UnsavedNote
        hasText={Boolean(d.answer.trim() || d.free.trim())}
        onBack={() => selectTab('write')}
        onSave={() =>
          void save(draftForm()).then((result) => {
            journal.notify(t(result === 'saved' ? 'toastSaved' : 'saveFail'))
            setUnsavedTick((n) => n + 1)
          })
        }
      />
    )
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
        <KeyScreen mode={phase.mode} email={account.email} canRecover={account.canRecover} actions={account.keyActions} onModeChange={account.setKeyMode} signInMethod={account.signInMethod} />
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
  if (phase.kind === 'security' && phase.mode === 'delete') {
    return (
      <div class="app">
        <DeleteAccountScreen
          signInMethod={account.security.signInMethod()}
          onDelete={account.security.deleteAccount}
          authErrorKey={account.authErrorKey}
          onDeleted={(result) => restartWithNotice(t(result === 'done' ? 'delDone' : 'delPartial'))}
          onCancel={account.security.close}
        />
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
      <main key={tab} class={tabMotion ? `tab-in tab-in--${tabMotion}` : undefined}>
        {tab === 'write' && draft.ready && (
          <WriteScreen
            key={draftScope ?? 'none'}
            initialDraft={draft.current()}
            onDraftChange={(d) => draft.update(d)}
            ownWords={own.words(draft.current().feelings)}
            onAddOwn={own.add}
            onHideOwn={own.hide}
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
            showLook={look.pathLook}
            scale={scale}
            scaleWords={scaleWords}
            currentLook={{ skin: theme.skin, mode: resolvedMode(theme.mode), font: look.font }}
            notice={unsavedNote()}
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
            saveFile={journal.saveFile}
            notify={journal.notify}
          />
        )}
      </main>
      {tab !== 'write' && (
        <button type="button" class="write__support app__support" onClick={() => setSupportOpen(true)}>
          <SupportIcon />
          {t('supportLink')}
        </button>
      )}
      <footer class="app-foot recede" ref={footRef}>
        <button type="button" class="app-foot__toggle" aria-expanded={aboutOpen} onClick={() => setAboutOpen(!aboutOpen)}>
          {t('about')}
          <span class="app-foot__chevron" aria-hidden="true" />
        </button>
        {aboutOpen && (
          <div class="app-foot__body">
            <p>Quiet Page · {t('beta')}</p>
            <p>{t('freeNote')}</p>
            <p>{t('feedbackShort')}</p>
            <button type="button" class="link-btn" onClick={() => setWelcome(true)}>{t('howItWorks')}</button>
            <button type="button" class="link-btn" onClick={() => setLegalOpen(true)}>{t('legal')}</button>
          </div>
        )}
      </footer>
      <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
      <LegalSheet open={legalOpen} onClose={() => setLegalOpen(false)} />
      <SettingsSheet
        open={settingsOpen}
        theme={theme}
        look={look}
        scale={scale}
        hasRecords={journal.records.length > 0}
        backup={journal.backup}
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
                onDeleteAccount: () => {
                  setSettingsOpen(false)
                  account.security.open('delete')
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
        onWipeLocal={
          phase.kind === 'local' && !demo && journal.records.length > 0
            ? () => {
                account.wipeLocal()
                restartWithNotice(t('delLocalDone'))
              }
            : undefined
        }
        onClose={() => setSettingsOpen(false)}
      />
      <Toast message={journal.toast} />
    </div>
  )
}

const NOTICE_KEY = 'qp-notice'

/**
 * After deleting data the app starts afresh (so no screen keeps old entries in memory)
 * and shows one quiet line about what happened.
 */
function restartWithNotice(message: string): void {
  try {
    sessionStorage.setItem(NOTICE_KEY, message)
  } catch {
    // without session storage the page simply reloads without the line
  }
  window.location.reload()
}

function takeNotice(): string | null {
  try {
    const notice = sessionStorage.getItem(NOTICE_KEY)
    sessionStorage.removeItem(NOTICE_KEY)
    return notice
  } catch {
    return null
  }
}
