import { isBoolean, oneOf, readSetting, writeSetting } from '../settings/storage.ts'

/** Palettes from the legacy site; colours here only draw the previews in Settings. */
export const SKINS = [
  { id: 'hlybyna', dark: { bg: '#1a2b35', p: '#82cfcb', lo: '#6a86a8', w: '#e8c08a' }, light: { bg: '#d6e1e3', p: '#2a7680', lo: '#7f93b0', w: '#a5702b' } },
  { id: 'khvylia', dark: { bg: '#182c2b', p: '#86d6c1', lo: '#5f8794', w: '#eabf93' }, light: { bg: '#d4e2de', p: '#237d6b', lo: '#8299a6', w: '#a26d37' } },
  { id: 'lis', dark: { bg: '#1d2721', p: '#a3cfac', lo: '#73897b', w: '#e0b977' }, light: { bg: '#e4eae0', p: '#4b7e5e', lo: '#a69c8a', w: '#a6722e' } },
  { id: 'nich', dark: { bg: '#1c2335', p: '#9bbcef', lo: '#6f74a8', w: '#ecc38c' }, light: { bg: '#e3e7f1', p: '#3f63a8', lo: '#9a94b8', w: '#a8722f' } },
  { id: 'lavanda', dark: { bg: '#23232f', p: '#b4a8e6', lo: '#7d7aa8', w: '#ebc28c' }, light: { bg: '#e2e0ea', p: '#6a5aa8', lo: '#9d9ab8', w: '#a46d33' } },
  { id: 'svitanok', dark: { bg: '#2a2128', p: '#e7a9a0', lo: '#8b7593', w: '#f0c08a' }, light: { bg: '#ebe0dd', p: '#a85d5a', lo: '#a596ad', w: '#a8672f' } },
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
