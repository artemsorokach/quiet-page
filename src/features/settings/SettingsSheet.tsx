import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { LANGS, type Lang } from '../../core/i18n/format.ts'
import { SCALE_IDS, type ScaleId, type Scales } from '../../core/journal/records.ts'
import { SKINS, resolvedMode, type Theme, type ThemeMode } from '../../core/theme/theme.ts'
import { Button } from '../../ui/Button.tsx'
import { Segmented } from '../../ui/Choice.tsx'
import { Sheet } from '../../ui/Sheet.tsx'
import './Settings.css'

const LANG_NAMES: Record<Lang, string> = {
  uk: 'Українська', ru: 'Русский', en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano', es: 'Español', pt: 'Português',
}

export interface AccountSettings {
  email: string
  askEveryTime: boolean
  onAskEveryTime: (on: boolean) => void
  onChangePassword: () => void
  onNewCode: () => void
  onSignOut: () => void
}

interface SettingsSheetProps {
  open: boolean
  theme: Theme
  scale: ScaleId
  /** null while entries live only in this browser */
  account: AccountSettings | null
  onTheme: (theme: Theme) => void
  onScale: (scale: ScaleId) => void
  onLang: (lang: Lang) => void
  onSignIn: () => void
  onClose: () => void
}

/** Look, mood words, language and — when signed in — the entries password. */
export function SettingsSheet(props: SettingsSheetProps) {
  const { t, lang, messages } = useI18n()
  const { theme, account } = props
  const mode = resolvedMode(theme.mode)
  const scales = messages.scales as unknown as Scales

  return (
    <Sheet open={props.open} title={t('settingsBtn')} closeLabel={t('close')} onClose={props.onClose}>
      <div class="settings__group">
        <p class="label">{t('mode')}</p>
        <Segmented<ThemeMode>
          label={t('mode')}
          value={theme.mode}
          onChange={(next) => props.onTheme({ ...theme, mode: next })}
          options={[
            { value: 'dark', label: t('dark') },
            { value: 'light', label: t('light') },
            { value: 'system', label: t('system') },
          ]}
        />
      </div>

      <div class="settings__group">
        <p class="label">{t('colors')}</p>
        <div class="settings__skins">
          {SKINS.map((skin, i) => {
            const c = skin[mode]
            return (
              <button type="button" key={skin.id} class="settings__skin" aria-pressed={theme.skin === skin.id} onClick={() => props.onTheme({ ...theme, skin: skin.id })}>
                <span class="settings__swatch" style={{ background: `radial-gradient(circle at 35% 30%, ${c.p} 0%, ${c.lo} 55%, ${c.bg} 100%)`, '--warm-dot': c.w }} />
                {messages.skins[i]}
              </button>
            )
          })}
        </div>
      </div>

      <div class="settings__group">
        <p class="label">{t('scaleLbl')}</p>
        <div class="settings__scales">
          {SCALE_IDS.map((id) => {
            const [name, words] = scales[id] ?? ['', []]
            return (
              <button type="button" key={id} class="settings__scale" aria-pressed={props.scale === id} onClick={() => props.onScale(id)}>
                <b>{name}</b>
                <span>{words[0]} … {words[4]}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div class="settings__group">
        <p class="label">{t('langLbl')}</p>
        <div class="settings__langs">
          {LANGS.map((id) => (
            <button type="button" key={id} lang={id} class="settings__lang" aria-pressed={lang === id} onClick={() => props.onLang(id)}>
              {LANG_NAMES[id]}
            </button>
          ))}
        </div>
      </div>

      <div class="settings__group settings__account">
        <p class="label">{t('account')}</p>
        {account ? (
          <>
            <p class="settings__email">
              <span>{account.email}</span>
              <button type="button" class="link-btn" onClick={account.onSignOut}>{t('signOut')}</button>
            </p>
            <div class="settings__links">
              <button type="button" class="link-btn" onClick={account.onChangePassword}>{t('chPass')}</button>
              <button type="button" class="link-btn" onClick={account.onNewCode}>{t('newCode')}</button>
            </div>
            <label class="settings__toggle">
              <input type="checkbox" checked={account.askEveryTime} onChange={(e) => account.onAskEveryTime(e.currentTarget.checked)} />
              <span>{t('askEvery')}</span>
            </label>
          </>
        ) : (
          <p class="settings__local">
            {t('localNotice')} <button type="button" class="link-btn" onClick={props.onSignIn}>{t('signIn')}</button>
          </p>
        )}
      </div>

      <Button variant="ghost" onClick={props.onClose}>{t('done')}</Button>
    </Sheet>
  )
}
