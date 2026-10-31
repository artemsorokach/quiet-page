import { WRITING_FONTS, type WritingFont } from './look.ts'
import { SKINS, type SkinId } from './theme.ts'

/** The look an entry was written in: saved inside the (encrypted) record. */
export interface RecordLook {
  skin: SkinId
  mode: 'dark' | 'light'
  font: WritingFont
}

const SKIN_IDS: readonly string[] = SKINS.map((s) => s.id)

/** Reads the saved look back, ignoring anything unknown (records from other versions or a backup file). */
export function recordLook(record: { look?: unknown }): RecordLook | null {
  const look = record.look
  if (!look || typeof look !== 'object') return null
  const { skin, mode, font } = look as Record<string, unknown>
  if (typeof skin !== 'string' || !SKIN_IDS.includes(skin)) return null
  if (mode !== 'dark' && mode !== 'light') return null
  const safeFont = typeof font === 'string' && (WRITING_FONTS as readonly string[]).includes(font) ? (font as WritingFont) : 'nunito'
  return { skin: skin as SkinId, mode, font: safeFont }
}

/** Attributes that give one card its own palette and font (see tokens.css). */
export function lookAttributes(look: RecordLook | null): Record<string, string> {
  return look ? { 'data-look': `${look.skin}-${look.mode}`, 'data-look-font': look.font } : {}
}
