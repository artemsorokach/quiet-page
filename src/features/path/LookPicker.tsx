import { useEffect, useState } from 'preact/hooks'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { FONT_FAMILY, WRITING_FONTS, loadWritingFont } from '../../core/theme/look.ts'
import type { RecordLook } from '../../core/theme/recordLook.ts'
import { SKINS } from '../../core/theme/theme.ts'
import { Segmented } from '../../ui/Choice.tsx'

interface LookPickerProps {
  value: RecordLook
  /** called on every change so the card can show it at once */
  onChange: (look: RecordLook) => void
  onDone: () => void
  onCancel: () => void
}

/** «•••» → «Оформлення»: colour, light or dark, and font for this one entry. */
export function LookPicker({ value, onChange, onDone, onCancel }: LookPickerProps) {
  const { t, messages } = useI18n()
  const [look, setLook] = useState(value)
  useEffect(() => WRITING_FONTS.forEach((font) => void loadWritingFont(font)), [])

  const change = (next: Partial<RecordLook>) => {
    const updated = { ...look, ...next }
    setLook(updated)
    onChange(updated)
  }

  return (
    <div class="look-picker" role="group" aria-label={t('lookTitle')}>
      <p class="look-picker__label">{t('lookTitle')}</p>
      <div class="look-picker__skins">
        {SKINS.map((skin, i) => {
          const c = skin[look.mode]
          return (
            <button
              type="button" key={skin.id} class="look-picker__skin" aria-pressed={look.skin === skin.id} aria-label={messages.skins[i]}
              style={{ background: `radial-gradient(circle at 35% 30%, ${c.p} 0%, ${c.lo} 55%, ${c.bg} 100%)` }}
              onClick={() => change({ skin: skin.id })}
            />
          )
        })}
      </div>
      <Segmented
        value={look.mode} label={t('mode')}
        options={[{ value: 'light', label: t('light') }, { value: 'dark', label: t('dark') }]}
        onChange={(mode) => change({ mode })}
      />
      <div class="look-picker__fonts">
        {WRITING_FONTS.map((font, i) => (
          <button
            type="button" key={font} class="look-picker__font" aria-pressed={look.font === font} aria-label={messages.fonts[i]}
            style={{ fontFamily: FONT_FAMILY[font] }} onClick={() => change({ font })}
          >
            Аа
          </button>
        ))}
      </div>
      <div class="look-picker__actions">
        <button type="button" class="link-btn" onClick={onCancel}>{t('lookUndo')}</button>
        <button type="button" class="btn btn--primary look-picker__done" onClick={onDone}>{t('done')}</button>
      </div>
    </div>
  )
}
