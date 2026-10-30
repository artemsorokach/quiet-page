import { createContext } from 'preact'
import type { ComponentChildren } from 'preact'
import { useContext, useMemo } from 'preact/hooks'
import uk from '../../i18n/locales/uk.json'
import { format, type Lang, type Params } from './format.ts'

export type Messages = typeof uk
type StringKey = { [K in keyof Messages]: Messages[K] extends string ? K : never }[keyof Messages]

export interface Translator {
  lang: Lang
  messages: Messages
  t: (key: StringKey, params?: Params) => string
}

const I18nContext = createContext<Translator | null>(null)

interface I18nProviderProps {
  lang: Lang
  messages: Messages
  children: ComponentChildren
}

export function I18nProvider({ lang, messages, children }: I18nProviderProps) {
  const value = useMemo<Translator>(
    () => ({ lang, messages, t: (key, params) => format(messages[key] ?? uk[key], params) }),
    [lang, messages],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): Translator {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
