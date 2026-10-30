import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { LANGS, type Lang } from '../../core/i18n/format.ts'
import { Button } from '../../ui/Button.tsx'
import { HeartHandIcon, MarkIcon, MoonIcon, SunIcon } from '../../ui/icons.tsx'
import { Paragraphs, RichText } from '../../ui/RichText.tsx'
import './Welcome.css'

interface WelcomeScreenProps {
  /** the person has been here before: «Повернутися» instead of «Почати» */
  returning: boolean
  darkNow: boolean
  onToggleDark: () => void
  onLang: (lang: Lang) => void
  onStart: () => void
  onDemo: () => void
  onSupport: () => void
}

const SHORT: Record<Lang, string> = { uk: 'UA', ru: 'RU', en: 'EN', fr: 'FR', de: 'DE', it: 'IT', es: 'ES', pt: 'PT' }

/** First screen: what the app is, how it keeps entries private, and a calm way in. */
export function WelcomeScreen({ returning, darkNow, onToggleDark, onLang, onStart, onDemo, onSupport }: WelcomeScreenProps) {
  const { t, lang } = useI18n()
  return (
    <section class="welcome" aria-labelledby="welcome-title">
      <div class="welcome__top">
        <div class="welcome__langs" role="group" aria-label={t('langLbl')}>
          {LANGS.map((id) => (
            <button type="button" key={id} lang={id} class="welcome__lang" aria-pressed={id === lang} onClick={() => onLang(id)}>
              {SHORT[id]}
            </button>
          ))}
        </div>
        <button type="button" class="welcome__theme" aria-label={darkNow ? t('light') : t('dark')} onClick={onToggleDark}>
          {darkNow ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      <span class="welcome__mark"><MarkIcon /></span>
      <div>
        <h1 class="welcome__title" id="welcome-title">{t('appName')}</h1>
        <p class="welcome__sub">{t('wSub')}</p>
      </div>
      <p class="welcome__lead">{t('wLead')}</p>

      <details class="welcome__what">
        <summary>{t('wWhat')}</summary>
        <div class="welcome__what-body"><Paragraphs text={t('wWhatBody')} /></div>
      </details>

      <ul class="welcome__points">
        {(['w1', 'w2', 'w3', 'w4'] as const).map((key) => (
          <li key={key}><RichText text={t(key)} /></li>
        ))}
      </ul>

      <p class="welcome__privacy">{t('wPrivacy')}</p>
      <p class="welcome__beta">{t('betaNote')}</p>

      <div class="welcome__actions">
        <Button onClick={onStart}>{returning ? t('back') : t('start')}</Button>
        <Button variant="ghost" onClick={onDemo}>{t('demoBtn')}</Button>
      </div>
      <button type="button" class="write__support" onClick={onSupport}>
        <HeartHandIcon />
        {t('supportLink')}
      </button>
    </section>
  )
}
