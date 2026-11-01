import { useEffect, useState } from 'preact/hooks'
import { detectLang, isLang, type Lang } from '../../core/i18n/format.ts'
import type { Messages } from '../../core/i18n/I18nProvider.tsx'
import { DEFAULT_SCALE, SCALE_IDS, type ScaleId } from '../../core/journal/records.ts'
import { oneOf, readSetting, writeSetting } from '../../core/settings/storage.ts'
import { applyLook, readLook, saveLook, type Look } from '../../core/theme/look.ts'
import { applyTheme, readTheme, saveTheme, type Theme } from '../../core/theme/theme.ts'
import uk from '../../i18n/locales/uk.json'

const locales = import.meta.glob<{ default: Messages }>('../../i18n/locales/*.json')
const loadMessages = async (lang: Lang): Promise<Messages> =>
  lang === 'uk' ? (uk as Messages) : ((await locales[`../../i18n/locales/${lang}.json`]?.())?.default ?? (uk as Messages))

function initialLang(): Lang {
  const saved = readSetting<string | null>('ts-lang', null, (v): v is string | null => v === null || typeof v === 'string')
  return isLang(saved) ? saved : detectLang(navigator.languages ?? [navigator.language])
}

/** Language, look and mood words — kept under the legacy keys so both versions share them. */
export function usePreferences() {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const [messages, setMessages] = useState<Messages | null>(lang === 'uk' ? (uk as Messages) : null)
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const [look, setLookState] = useState<Look>(readLook)
  const [scale, setScaleState] = useState<ScaleId>(() => readSetting<ScaleId>('ts-scale', DEFAULT_SCALE, oneOf(SCALE_IDS)))

  useEffect(() => {
    let current = true
    void loadMessages(lang).then((loaded) => {
      if (current) setMessages(loaded)
    })
    document.documentElement.lang = lang
    return () => {
      current = false
    }
  }, [lang])

  useEffect(() => {
    applyTheme(theme)
    if (theme.mode !== 'system' || typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-color-scheme: light)')
    const follow = () => applyTheme(theme)
    query.addEventListener('change', follow)
    return () => query.removeEventListener('change', follow)
  }, [theme])

  useEffect(() => applyLook(look), [look])

  return {
    look,
    setLook: (next: Look) => {
      saveLook(next)
      setLookState(next)
    },
    lang,
    messages,
    theme,
    scale,
    setLang: (next: Lang) => {
      writeSetting('ts-lang', next)
      setLangState(next)
    },
    setTheme: (next: Theme) => {
      saveTheme(next)
      setThemeState(next)
    },
    setScale: (next: ScaleId) => {
      writeSetting('ts-scale', next)
      setScaleState(next)
    },
  }
}
