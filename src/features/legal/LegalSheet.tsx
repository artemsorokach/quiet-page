import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { Sheet } from '../../ui/Sheet.tsx'
import './Legal.css'

interface LegalSheetProps {
  open: boolean
  onClose: () => void
}

/** «Про додаток» → privacy and legal information, short sections in the app's language. */
export function LegalSheet({ open, onClose }: LegalSheetProps) {
  const { t, messages } = useI18n()
  return (
    <Sheet open={open} title={t('legal')} closeLabel={t('close')} onClose={onClose}>
      <div class="legal">
        {messages.legalSections.map(([heading = '', text = '']) => (
          <section key={heading} class="legal__part">
            <h3 class="legal__heading">{heading}</h3>
            <p class="legal__text">{text}</p>
          </section>
        ))}
        <p class="legal__updated">{t('legalUpdated')}</p>
      </div>
    </Sheet>
  )
}
