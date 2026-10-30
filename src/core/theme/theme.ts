import { isBoolean, oneOf, readSetting, writeSetting } from '../settings/storage.ts'

/** Palettes from the legacy site; colours here only draw the previews in Settings. */
export const SKINS = [
  { id: 'hlybyna', dark: { bg: '#0c1a24', p: '#74c7c4', lo: '#4a6890', w: '#e6bb7e' }, light: { bg: '#e2ebec', p: '#2c7c86', lo: '#8a9cb8', w: '#ad772f' } },
  { id: 'khvylia', dark: { bg: '#0d1f1f', p: '#7fd3bd', lo: '#45707e', w: '#e9b98a' }, light: { bg: '#dfebe8', p: '#258370', lo: '#8aa2ae', w: '#a9733a' } },
  { id: 'lis', dark: { bg: '#111c16', p: '#9ccaa6', lo: '#5a7466', w: '#ddb36e' }, light: { bg: '#e4eae0', p: '#4b7e5e', lo: '#a69c8a', w: '#a6722e' } },
  { id: 'nich', dark: { bg: '#0f1526', p: '#90b6ee', lo: '#62669e', w: '#ebbf86' }, light: { bg: '#e3e7f1', p: '#3f63a8', lo: '#9a94b8', w: '#a8722f' } },
] as const

export type SkinId = (typeof SKINS)[number]['id']
export type ThemeMode = 'dark' | 'light' | 'system'
export const THEME_MODES: readonly ThemeMode[] = ['dark', 'light', 'system']
const SKIN_IDS = SKINS.map((s) => s.id) as readonly SkinId[]

export interface Theme {
  skin: SkinId
  mode: ThemeMode
}

export function readTheme(): Theme {
  return {
    skin: readSetting<SkinId>('ts-pal', 'hlybyna', oneOf(SKIN_IDS)),
    mode: readSetting<ThemeMode>('ts-mode', 'system', oneOf(THEME_MODES)),
  }
}

export function saveTheme(theme: Theme): void {
  writeSetting('ts-pal', theme.skin)
  writeSetting('ts-mode', theme.mode)
}

const prefersLight = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches
export const resolvedMode = (mode: ThemeMode): 'dark' | 'light' => (mode === 'system' ? (prefersLight() ? 'light' : 'dark') : mode)

/** Sets data-skin on <html>; tokens.css holds the colours for each palette and mode. */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-skin', `${theme.skin}-${resolvedMode(theme.mode)}`)
}

export const readFlag = (key: string) => readSetting(key, false, isBoolean)
