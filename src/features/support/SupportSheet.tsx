import { useMemo, useState } from 'preact/hooks'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { Sheet } from '../../ui/Sheet.tsx'
import { COUNTRIES, HELPLINES, VERIFIED_ON, guessCountry, telHref, type Country } from './helplines.ts'
import './SupportSheet.css'

interface SupportSheetProps {
  open: boolean
  onClose: () => void
}

function initialCountry(): Country {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return guessCountry(zone, navigator.languages ?? [navigator.language])
}

export function SupportSheet({ open, onClose }: SupportSheetProps) {
  const { lang, messages, t } = useI18n()
  const [emergencyBefore = '', emergencyAfter = ''] = messages.supportEmergency.split('{n}')
  const [country, setCountry] = useState<Country>(initialCountry)
  const regionNames = useMemo(() => new Intl.DisplayNames([lang], { type: 'region' }), [lang])
  const verified = useMemo(
    () => new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(new Date(VERIFIED_ON)),
    [lang],
  )
  const { lines, emergency } = HELPLINES[country]

  return (
    <Sheet open={open} title={t('supportLink')} closeLabel={t('close')} onClose={onClose}>
      <p class="support__lead">{t('supportLead')}</p>

      <label class="support__country">
        <span>{t('supportCountry')}</span>
        <select value={country} onChange={(event) => setCountry(event.currentTarget.value as Country)}>
          {COUNTRIES.map((code) => (
            <option key={code} value={code}>{regionNames.of(code) ?? code}</option>
          ))}
        </select>
      </label>

      <ul class="support__lines">
        {lines.map((line) => (
          <li key={line.number} class="support__line">
            <div class="support__line-text">
              <span class="support__name">{line.name}</span>
              <span class="support__meta">
                {line.hours ?? t('supportAllDay')}
                {line.note ? ` · ${line.note}` : ''}
              </span>
            </div>
            <a class="support__call" href={telHref(line.number)} aria-label={`${line.name}, ${line.number}`}>
              {line.number}
            </a>
          </li>
        ))}
      </ul>

      <p class="support__emergency">
        {emergencyBefore}
        <a href={telHref(emergency)}>{emergency}</a>
        {emergencyAfter}
      </p>
      <p class="support__verified">{t('supportVerified', { date: verified })}</p>
    </Sheet>
  )
}
