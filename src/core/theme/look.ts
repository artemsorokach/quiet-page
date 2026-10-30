import { isBoolean, oneOf, readSetting, writeSetting } from '../settings/storage.ts'

export const ATMOSPHERES = ['still', 'breath', 'texture'] as const
export type Atmosphere = (typeof ATMOSPHERES)[number]

/** Writing fonts; the order matches the locale's `fonts` names. All are self-hosted (no requests to Google). */
export const WRITING_FONTS = ['nunito', 'rubik', 'comfortaa', 'lora', 'caveat'] as const
export type WritingFont = (typeof WRITING_FONTS)[number]

export const FONT_FAMILY: Record<WritingFont, string> = {
  nunito: '"Nunito Variable"',
  rubik: '"Rubik"',
  comfortaa: '"Comfortaa"',
  lora: '"Lora"',
  caveat: '"Caveat"',
}

const fontLoaders: Record<Exclude<WritingFont, 'nunito'>, () => Promise<unknown>> = {
  rubik: () => import('@fontsource/rubik/400.css'),
  comfortaa: () => import('@fontsource/comfortaa/400.css'),
  lora: () => Promise.all([import('@fontsource/lora/400.css'), import('@fontsource/lora/400-italic.css')]),
  caveat: () => import('@fontsource/caveat/400.css'),
}

/** Loads a writing font's stylesheet once; the browser then fetches only the glyph ranges it needs. */
export function loadWritingFont(font: WritingFont): Promise<unknown> {
  return font === 'nunito' ? Promise.resolve() : fontLoaders[font]().catch(() => undefined)
}

export interface Look {
  atmosphere: Atmosphere
  font: WritingFont
  /** fade the rest of the page while writing */
  focus: boolean
}

export function readLook(): Look {
  return {
    atmosphere: readSetting<Atmosphere>('ts-atmo', 'still', oneOf(ATMOSPHERES)),
    font: readSetting<WritingFont>('ts-wfont', 'nunito', oneOf(WRITING_FONTS)),
    focus: readSetting('ts-focus', true, isBoolean),
  }
}

export function saveLook(look: Look): void {
  writeSetting('ts-atmo', look.atmosphere)
  writeSetting('ts-wfont', look.font)
  writeSetting('ts-focus', look.focus)
}

export function applyLook(look: Look): void {
  const root = document.documentElement
  root.setAttribute('data-atmo', look.atmosphere)
  root.setAttribute('data-wfont', look.font)
  void loadWritingFont(look.font)
  if (!look.focus) document.body.classList.remove('writing')
}
