import type { Lang } from '../i18n/format.ts'

/** Locale used for dates per language (same as the legacy site). */
export const LOCALES: Record<Lang, string> = {
  uk: 'uk-UA', ru: 'ru-RU', en: 'en-GB', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', es: 'es-ES', pt: 'pt-PT',
}

/** Calendar day in local time, e.g. "2026-10-30" (month and day without padding, as in legacy). */
export function dayKey(time: number | Date): string {
  const d = new Date(time)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function parseDayKey(key: string): Date {
  const [y = 1970, m = 1, d = 1] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export interface DateFormat {
  /** «пʼятниця, 30 жовтня» */
  date: (time: number | Date) => string
  /** «30 жовтня» */
  day: (time: number | Date) => string
  /** «14:05» */
  time: (time: number | Date) => string
  /** «Жовтень 2026» */
  month: (time: number | Date) => string
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export function dateFormat(lang: Lang): DateFormat {
  const locale = LOCALES[lang]
  const date = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' })
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
  const month = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
  return {
    date: (t) => date.format(new Date(t)),
    day: (t) => day.format(new Date(t)),
    time: (t) => time.format(new Date(t)),
    month: (t) => capitalize(month.format(new Date(t))),
  }
}
