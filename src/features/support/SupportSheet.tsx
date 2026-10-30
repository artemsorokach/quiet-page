import { useMemo, useState } from 'preact/hooks'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { Sheet } from '../../ui/Sheet.tsx'
import { COUNTRIES, HELPLINES, VERIFIED_ON, guessCountry, telHref, type Country, type Helpline, type LineKind, type LineNote } from './helplines.ts'
import './SupportSheet.css'

interface SupportSheetProps {
  open: boolean
  onClose: () => void
}

function initialCountry(): Country {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return guessCountry(zone, navigator.languages ?? [navigator.language])
}

const KIND_KEY = {
  talk: 'hlTalk', english: 'hlEnglish', youth: 'hlYouth', crisis: 'hlCrisis', psych: 'hlPsych', welsh: 'hlWelsh',
} as const satisfies Record<LineKind, string>
const NOTE_KEY = { byRegion: 'supportByRegion', usLangs: 'supportUsLangs', interpreters: 'supportInterpreters' } as const satisfies Record<LineNote, string>

function Line({ line, languages, regions }: { line: Helpline; languages: Intl.DisplayNames; regions: Intl.DisplayNames }) {
  const { t } = useI18n()
  const title = t(KIND_KEY[line.kind])
  const when = line.hours ? t('supportDaily', { h: line.hours }) : t('supportAllDay')
  const langs = t('supportLangs', { list: line.langs.map((code) => languages.of(code) ?? code).join(', ') })
  return (
    <li class="support__line">
      <div class="support__line-text">
        <span class="support__name">{title}</span>
        <span class="support__official">{line.official}</span>
        <span class="support__meta">{when} · {langs}</span>
        {line.notes?.map((note) => <span key={note} class="support__note">{t(NOTE_KEY[note])}</span>)}
        {line.alsoFrom && (
          <span class="support__note">{t('supportAlsoFrom', { list: line.alsoFrom.map((code) => regions.of(code) ?? code).join(', ') })}</span>
        )}
      </div>
      <a class="support__call" href={telHref(line.number)} aria-label={`${title}, ${line.official}: ${line.number}`}>
        {line.number}
      </a>
    </li>
  )
}

export function SupportSheet({ open, onClose }: SupportSheetProps) {
  const { lang, messages, t } = useI18n()
  const [emergencyBefore = '', emergencyAfter = ''] = messages.supportEmergency.split('{n}')
  const [country, setCountry] = useState<Country>(initialCountry)
  const regionNames = useMemo(() => new Intl.DisplayNames([lang], { type: 'region' }), [lang])
  const languageNames = useMemo(() => new Intl.DisplayNames([lang], { type: 'language' }), [lang])
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

      {lines.length > 0 ? (
        <p class="support__reach">{t('supportReach', { country: regionNames.of(country) ?? country })}</p>
      ) : (
        <p class="support__reach">{t('supportNoFree')}</p>
      )}

      <ul class="support__lines">
        {lines.map((line) => (
          <Line key={line.number} line={line} languages={languageNames} regions={regionNames} />
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
