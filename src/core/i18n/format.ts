export const LANGS = ['uk', 'ru', 'en', 'fr', 'de', 'it', 'es', 'pt'] as const
export type Lang = (typeof LANGS)[number]

export type Params = Record<string, string | number>

const PLACEHOLDER = /\{(\w+)\}/g

/** Replaces {name} placeholders; unknown placeholders stay visible so a missing value is noticed. */
export function format(template: string, params: Params = {}): string {
  return template.replace(PLACEHOLDER, (whole, name: string) => (name in params ? String(params[name]) : whole))
}

export function placeholdersOf(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((match) => match[1] ?? '').sort()
}

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value)
}

/** Picks the first supported language from the browser's preferences, Ukrainian otherwise. */
export function detectLang(preferred: readonly string[]): Lang {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLang(base)) return base
  }
  return 'uk'
}
