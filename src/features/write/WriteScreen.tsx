import { useEffect, useRef, useState } from 'preact/hooks'
import type { Draft } from '../../core/draft/draft.ts'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { Button } from '../../ui/Button.tsx'
import { GrowingTextarea } from '../../ui/GrowingTextarea.tsx'
import { FeelingsPicker } from '../../ui/FeelingsPicker.tsx'
import { SupportIcon } from '../../ui/icons.tsx'
import { MoodScale, type Mood } from '../../ui/MoodScale.tsx'
import { FEELING_KEYS } from '../../core/journal/feelings.ts'
import type { WriteForm } from './composeRecord.ts'
import { useWritingFocus } from './useWritingFocus.ts'
import './WriteScreen.css'

export type SaveResult = 'saved' | 'failed'

interface WriteScreenProps {
  date: Date
  greeting: string
  question: { text: string; index: number } | null
  scale: string
  /** Shown after saving while entries are kept only in this browser */
  localOnly: boolean
  /** fade the rest of the page while typing */
  focusMode: boolean
  onNextQuestion: () => void
  onToggleQuestion: () => void
  onOpenSupport: () => void
  onSignIn: () => void
  onSave: (form: WriteForm) => Promise<SaveResult>
  /** what was on the page before (kept on this device until «Зберегти») */
  initialDraft: Draft
  onDraftChange: (draft: Omit<Draft, 'question'>) => void
  /** the person's own feeling words */
  ownWords: readonly string[]
  onAddOwn: (word: string) => string
  onHideOwn: (word: string) => void
}

/** A scale is stored as [name, [five words]]. */
function scaleWords(scale: readonly (string | readonly string[])[] | undefined): readonly string[] {
  const words = scale?.[1]
  return Array.isArray(words) ? words : []
}

export function WriteScreen(props: WriteScreenProps) {
  const { lang, messages, t } = useI18n()
  const [mood, setMood] = useState<Mood | null>(props.initialDraft.mood as Mood | null)
  const [feelings, setFeelings] = useState<string[]>(props.initialDraft.feelings)
  const [answer, setAnswer] = useState(props.initialDraft.answer)
  const [free, setFree] = useState(props.initialDraft.free)
  const firstRender = useRef(true)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const dateLabel = capitalize(new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' }).format(props.date))
  const scales = messages.scales as Record<string, readonly (string | readonly string[])[]>
  const words = scaleWords(scales[props.scale] ?? scales.vaha)
  const focus = useWritingFocus(props.focusMode)
  const hasContent = Boolean((props.question && answer.trim()) || free.trim() || mood !== null || feelings.length)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    props.onDraftChange({ mood, feelings, answer, free })
  }, [mood, feelings, answer, free])

  async function save() {
    focus.stop()
    setStatus('saving')
    const result = await props.onSave({ mood, scale: props.scale, feelings, question: props.question, answer, free, lang })
    if (result === 'failed') {
      setStatus('failed')
      return
    }
    setMood(null)
    setFeelings([])
    setAnswer('')
    setFree('')
    setStatus('saved')
  }

  return (
    <section class="write" aria-labelledby="write-greeting">
      <div class="write__intro recede">
        <p class="write__date">{dateLabel}</p>
        <p class="write__greeting" id="write-greeting">{status === 'saved' ? t('savedGreet') : props.greeting}</p>
      </div>

      <div class="write__state recede">
        <MoodScale words={words} value={mood} legend={t('howNow')} onChange={setMood} />
        <FeelingsPicker
          options={FEELING_KEYS.map((key, i) => ({ key, label: messages.feelings[i] ?? key }))}
          own={props.ownWords}
          value={feelings}
          labels={{
            add: t('feelAdd'), hide: t('feelHide'), prefix: t('feelsPrefix'),
            own: t('feelOwn'), ownPlaceholder: t('feelOwnPh'), ownAdd: t('addBtn'), ownRemove: t('feelHideOne'),
          }}
          onChange={setFeelings}
          onAddOwn={props.onAddOwn}
          onHideOwn={props.onHideOwn}
        />
      </div>

      <div class="write__fields" onInput={focus.onInput} onFocusOut={focus.onFocusOut}>

      {props.question ? (
        <div class="write__block">
          <p class="write__question-text" id="write-question">{props.question.text}</p>
          <div class="write__question-actions recede">
            <button type="button" class="write__chip" onClick={props.onNextQuestion}>{t('nextQ')}</button>
            <button type="button" class="write__chip" onClick={props.onToggleQuestion}>{t('hideQ')}</button>
          </div>
          <GrowingTextarea
            class="write__field write__field--answer"
            aria-labelledby="write-question"
            rows={3}
            placeholder={t('ansPh')}
            value={answer}
            onInput={(event) => setAnswer((event.currentTarget as HTMLTextAreaElement).value)}
          />
        </div>
      ) : (
        <div class="recede">
          <Button variant="quiet" onClick={props.onToggleQuestion}>{t('showQ')}</Button>
        </div>
      )}

      <div class="write__block">
        <label class="write__free-label" for="write-free">{t('free')}</label>
        <GrowingTextarea
          id="write-free"
          class="write__field"
          rows={6}
          placeholder={t('freePh')}
          value={free}
          onInput={(event) => setFree((event.currentTarget as HTMLTextAreaElement).value)}
        />
      </div>
      </div>

      {hasContent && status !== 'saving' && <p class="write__draft">{t('draftHint')}</p>}

      <div class="write__actions">
        <Button disabled={!hasContent || status === 'saving'} onClick={save}>{t('save')}</Button>
        <span class="write__private" role="status">
          {status === 'failed' ? t('saveFail') : t('privateNote')}
        </span>
      </div>

      {status === 'saved' && props.localOnly && (
        <p class="write__local">
          {t('localNotice')}{' '}
          <Button variant="quiet" onClick={props.onSignIn}>{t('signIn')}</Button>
        </p>
      )}

      <button type="button" class="write__support recede" onClick={props.onOpenSupport}>
        <SupportIcon />
        {t('supportLink')}
      </button>
    </section>
  )
}

/** «неділя, 1 листопада» → «Неділя, 1 листопада» (some languages write weekdays in lower case). */
function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1)
}
