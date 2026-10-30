/**
 * Helplines shown on the "If things are very hard right now" sheet.
 * Verified on 2026-10-30 from the sources listed next to each country.
 * Re-check at least every six months: lines change or pause (Lifeline Ukraine 7333 was paused
 * for lack of funding when this list was made, so it is not listed).
 */

export type Country = 'CH' | 'UA' | 'DE' | 'AT' | 'FR' | 'IT' | 'ES' | 'PT' | 'GB' | 'US'

export interface Helpline {
  name: string
  number: string
  /** null = around the clock; otherwise local opening hours */
  hours: string | null
  /** Short note in the line's own language, shown as is (e.g. "für Jugendliche") */
  note?: string
}

export interface CountryHelplines {
  lines: readonly Helpline[]
  emergency: string
}

export const VERIFIED_ON = '2026-10-30'

export const COUNTRIES: readonly Country[] = ['CH', 'UA', 'DE', 'AT', 'FR', 'IT', 'ES', 'PT', 'GB', 'US']

export const HELPLINES: Record<Country, CountryHelplines> = {
  // https://www.143.ch/en/a-conversation-often-helps/ · https://www.147.ch/de/beratung/147/
  // https://www.zh.ch/de/migration-integration/willkommen/english/emergencies.html
  CH: {
    lines: [
      { name: 'Die Dargebotene Hand · La Main Tendue · Telefono Amico', number: '143', hours: null },
      { name: 'Heart2Heart (English)', number: '0800 143 000', hours: '18:00–23:00' },
      { name: 'Pro Juventute', number: '147', hours: null, note: 'Jugendliche · jeunes · giovani' },
    ],
    emergency: '144',
  },
  // https://www.prostir.ua/?focus=de-shukaty-psyholohichnu-dopomohu-haryachi-liniji-ta-servisy-v-ukrajini (04.2025)
  // https://www.kmu.gov.ua/news/vseukrainska-prohrama-mentalnoho-zdorovia-ty-iak-kudy-zvertatysia-za-dopomohoiu
  UA: {
    lines: [{ name: 'Людина в біді (People in Need)', number: '0 800 210 160', hours: null }],
    emergency: '112',
  },
  // https://familienportal.de/familienportal/lebenslagen/krise-und-konflikt/krisetelefone-anlaufstellen
  DE: {
    lines: [
      { name: 'TelefonSeelsorge', number: '0800 111 0 111', hours: null },
      { name: 'TelefonSeelsorge', number: '0800 111 0 222', hours: null },
    ],
    emergency: '112',
  },
  // https://www.telefonseelsorge.at/
  AT: { lines: [{ name: 'Telefonseelsorge', number: '142', hours: null }], emergency: '144' },
  // https://www.sante.fr/le-numero-national-de-prevention-du-suicide-0
  FR: { lines: [{ name: '3114 · Prévention du suicide', number: '3114', hours: null }], emergency: '15' },
  // https://www.telefonoamico.it/centro-milano/
  IT: { lines: [{ name: 'Telefono Amico Italia', number: '02 2327 2327', hours: '09:00–24:00' }], emergency: '112' },
  // https://www.sanidad.gob.es/linea024/home.htm
  ES: { lines: [{ name: '024 · Atención a la conducta suicida', number: '024', hours: null }], emergency: '112' },
  // https://www.sosvozamiga.org/en/contactos
  PT: { lines: [{ name: 'SOS Voz Amiga', number: '213 544 545', hours: '15:30–00:30' }], emergency: '112' },
  // https://www.samaritans.org/how-we-can-help/contact-samaritan/
  GB: { lines: [{ name: 'Samaritans', number: '116 123', hours: null }], emergency: '999' },
  // https://988lifeline.org/get-help/
  US: { lines: [{ name: '988 Suicide & Crisis Lifeline', number: '988', hours: null, note: 'call or text' }], emergency: '911' },
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
