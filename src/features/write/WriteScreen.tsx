import { useState } from 'preact/hooks'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { Button } from '../../ui/Button.tsx'
import { HeartHandIcon } from '../../ui/icons.tsx'
import { MoodScale, type Mood } from '../../ui/MoodScale.tsx'
import './WriteScreen.css'

interface WriteScreenProps {
  date: Date
  greeting: string
  question: string | null
  onNextQuestion: () => void
  onToggleQuestion: () => void
  onOpenSupport: () => void
}

/** A scale is stored as [name, [five words]]. */
function scaleWords(scale: readonly (string | readonly string[])[]): readonly string[] {
  const words = scale[1]
  return Array.isArray(words) ? words : []
}

export function WriteScreen(props: WriteScreenProps) {
  const { lang, messages, t } = useI18n()
  const [mood, setMood] = useState<Mood | null>(null)
  const [answer, setAnswer] = useState('')
  const [free, setFree] = useState('')
  const dateLabel = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' }).format(props.date)
  const words = scaleWords(messages.scales.vaha)

  return (
    <section class="write" aria-labelledby="write-greeting">
      <p class="write__date">{dateLabel}</p>
      <p class="write__greeting" id="write-greeting">{props.greeting}</p>

      <MoodScale words={words} value={mood} legend={t('howNow')} onChange={setMood} />
      <div>
        <button type="button" class="write__chip">{t('feelAdd')}</button>
      </div>

      {props.question ? (
        <div class="write__block">
          <p class="write__question-text" id="write-question">{props.question}</p>
          <div class="write__question-actions">
            <button type="button" class="write__chip" onClick={props.onNextQuestion}>{t('nextQ')}</button>
            <button type="button" class="write__chip" onClick={props.onToggleQuestion}>{t('hideQ')}</button>
          </div>
          <textarea
            class="write__field write__field--answer"
            aria-labelledby="write-question"
            rows={3}
            placeholder={t('ansPh')}
            value={answer}
            onInput={(event) => setAnswer(event.currentTarget.value)}
          />
        </div>
      ) : (
        <div>
          <Button variant="quiet" onClick={props.onToggleQuestion}>{t('showQ')}</Button>
        </div>
      )}

      <div class="write__block">
        <label class="write__free-label" for="write-free">{t('free')}</label>
        <textarea
          id="write-free"
          class="write__field"
          rows={6}
          placeholder={t('freePh')}
          value={free}
          onInput={(event) => setFree(event.currentTarget.value)}
        />
      </div>

      <div class="write__actions">
        <Button disabled={!answer.trim() && !free.trim() && mood === null}>{t('save')}</Button>
        <span class="write__private">{t('privateNote')}</span>
      </div>

      <button type="button" class="write__support" onClick={props.onOpenSupport}>
        <HeartHandIcon />
        {t('supportLink')}
      </button>
    </section>
  )
}
