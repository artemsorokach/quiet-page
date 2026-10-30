/**
 * Helplines shown on the "If things are very hard right now" sheet.
 * Verified on 2026-10-30 from the sources listed next to each country.
 * Re-check at least every six months: lines change, pause or close.
 */

export type Country = 'CH' | 'UA' | 'DE' | 'AT' | 'FR' | 'IT' | 'ES' | 'PT' | 'GB' | 'US'

/** What the line is for; the description is shown in the app's language. */
export type LineKind = 'talk' | 'english' | 'youth' | 'crisis' | 'psych' | 'russian' | 'welsh'
/** Extra notes shown under a line, in the app's language. */
export type LineNote = 'byRegion' | 'usLangs' | 'berlin'

export interface Helpline {
  kind: LineKind
  /** official name, as the line introduces itself when answering */
  official: string
  number: string
  /** null = around the clock; otherwise daily opening hours, local time */
  hours: string | null
  /** languages the line answers in (ISO 639-1): the country's language, plus any its own sources name */
  langs: readonly string[]
  notes?: readonly LineNote[]
  /** other countries the number also works from */
  alsoFrom?: readonly string[]
}

export interface CountryHelplines {
  lines: readonly Helpline[]
  emergency: string
}

export const VERIFIED_ON = '2026-10-30'

export const COUNTRIES: readonly Country[] = ['CH', 'UA', 'DE', 'AT', 'FR', 'IT', 'ES', 'PT', 'GB', 'US']

export const HELPLINES: Record<Country, CountryHelplines> = {
  // https://www.143.ch/en/a-conversation-often-helps/ (143: de/fr/it, 24/7; English line 0800 143 000
  // daily 18–23, "only valid in Switzerland and the Principality of Liechtenstein")
  // https://www.147.ch/de/beratung/147/ (24/7, de/fr/it pages)
  CH: {
    lines: [
      { kind: 'talk', official: 'Die Dargebotene Hand · La Main Tendue · Telefono Amico', number: '143', hours: null, langs: ['de', 'fr', 'it'], notes: ['byRegion'] },
      { kind: 'english', official: 'Heart2Heart', number: '0800 143 000', hours: '18:00–23:00', langs: ['en'], alsoFrom: ['LI'] },
      { kind: 'youth', official: 'Pro Juventute 147', number: '147', hours: null, langs: ['de', 'fr', 'it'] },
    ],
    emergency: '144',
  },
  // https://www.kmu.gov.ua/news/vseukrainska-prohrama-mentalnoho-zdorovia-ty-iak-kudy-zvertatysia-za-dopomohoiu
  // Lifeline Ukraine 7333 was paused for lack of funding when this list was made, so it is not listed.
  UA: {
    lines: [{ kind: 'psych', official: 'Людина в біді', number: '0 800 210 160', hours: null, langs: ['uk'] }],
    emergency: '112',
  },
  // https://www.bundesregierung.de/breg-de/service/fragen-und-anworten/hilfs-und-krisentelefone-2009712
  // https://www.berlin.de/lb/psychiatrie/hilfe-in-krisen/artikel.927035.php (Doweria: Russian-speaking, 24 h)
  // Not listed: Helpline Ukraine (Nummer gegen Kummer) ended on 1 July 2026.
  DE: {
    lines: [
      { kind: 'talk', official: 'TelefonSeelsorge', number: '0800 111 0 111', hours: null, langs: ['de'] },
      { kind: 'talk', official: 'TelefonSeelsorge', number: '0800 111 0 222', hours: null, langs: ['de'] },
      { kind: 'russian', official: 'Telefon Doweria', number: '030 440 308 454', hours: null, langs: ['ru'], notes: ['berlin'] },
    ],
    emergency: '112',
  },
  // https://www.telefonseelsorge.at/
  AT: { lines: [{ kind: 'talk', official: 'TelefonSeelsorge', number: '142', hours: null, langs: ['de'] }], emergency: '144' },
  // https://www.sante.fr/le-numero-national-de-prevention-du-suicide-0
  FR: { lines: [{ kind: 'crisis', official: '3114 · Numéro national de prévention du suicide', number: '3114', hours: null, langs: ['fr'] }], emergency: '15' },
  // https://www.telefonoamico.it/centro-milano/ (every day 9–24)
  IT: { lines: [{ kind: 'talk', official: 'Telefono Amico Italia', number: '02 2327 2327', hours: '09:00–24:00', langs: ['it'] }], emergency: '112' },
  // https://www.sanidad.gob.es/linea024/home.htm
  ES: { lines: [{ kind: 'crisis', official: 'Línea 024 · Atención a la conducta suicida', number: '024', hours: null, langs: ['es'] }], emergency: '112' },
  // https://www.sosvozamiga.org/en/contactos (daily 15:30–00:30)
  PT: { lines: [{ kind: 'talk', official: 'SOS Voz Amiga', number: '213 544 545', hours: '15:30–00:30', langs: ['pt'] }], emergency: '112' },
  // https://www.samaritans.org/how-we-can-help/contact-samaritan/
  // https://www.samaritans.org/how-we-can-help/contact-samaritan/contact-a-samaritan-wales/ (Welsh line, every day 19–23)
  GB: {
    lines: [
      { kind: 'talk', official: 'Samaritans', number: '116 123', hours: null, langs: ['en'] },
      { kind: 'welsh', official: 'Samaritans · Llinell Gymraeg', number: '0808 164 0123', hours: '19:00–23:00', langs: ['cy'] },
    ],
    emergency: '999',
  },
  // https://988lifeline.org/faq/calling-the-988-lifeline/faq-is-the-988-lifeline-available-in-other-languages-for-non-english-speakers/
  US: { lines: [{ kind: 'crisis', official: '988 Suicide & Crisis Lifeline', number: '988', hours: null, langs: ['en', 'es'], notes: ['usLangs'] }], emergency: '911' },
}

export function telHref(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, '')}`
}

const ZONE_TO_COUNTRY: Record<string, Country> = {
  'Europe/Zurich': 'CH',
  'Europe/Kyiv': 'UA',
  'Europe/Kiev': 'UA',
  'Europe/Berlin': 'DE',
  'Europe/Vienna': 'AT',
  'Europe/Paris': 'FR',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Europe/Lisbon': 'PT',
  'Europe/London': 'GB',
}

function isCountry(value: string): value is Country {
  return (COUNTRIES as readonly string[]).includes(value)
}

/** Best guess for where the person is, without asking for location. Defaults to Switzerland. */
export function guessCountry(timeZone: string, languages: readonly string[]): Country {
  const byZone = ZONE_TO_COUNTRY[timeZone]
  if (byZone) return byZone
  if (timeZone.startsWith('America/')) return 'US'
  for (const tag of languages) {
    const region = tag.split('-')[1]?.toUpperCase()
    if (region && isCountry(region)) return region
  }
  return 'CH'
}
