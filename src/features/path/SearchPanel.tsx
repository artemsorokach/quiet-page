import { UK_FEELINGS } from '../../core/i18n/ukFeelings.ts'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { feelingLabel } from '../../core/journal/feelings.ts'
import { SearchIcon } from '../../ui/icons.tsx'

interface SearchPanelProps {
  query: string
  feelings: readonly string[]
  /** feelings that appear in the records, most frequent first */
  options: readonly string[]
  found: number
  onQuery: (query: string) => void
  onFeelings: (feelings: string[]) => void
}

/** Search by a word and by feelings. Runs on the device over decrypted entries. */
export function SearchPanel({ query, feelings, options, found, onQuery, onFeelings }: SearchPanelProps) {
  const { t, messages } = useI18n()
  const toggle = (f: string) => onFeelings(feelings.includes(f) ? feelings.filter((x) => x !== f) : [...feelings, f])
  const searching = query.trim() !== '' || feelings.length > 0
  return (
    <div class="search">
      <label class="search__field">
        <SearchIcon />
        <span class="sr-only">{t('toolSearch')}</span>
        <input type="search" value={query} placeholder={t('searchPh')} onInput={(e) => onQuery(e.currentTarget.value)} />
      </label>
      {options.length > 0 && (
        <div class="search__feelings" role="group" aria-label={t('feelingsLbl')}>
          {options.map((f) => (
            <button key={f} type="button" class="search__feeling" aria-pressed={feelings.includes(f)} onClick={() => toggle(f)}>
              {feelingLabel(f, messages.feelings, UK_FEELINGS)}
            </button>
          ))}
        </div>
      )}
      {searching && <p class="search__count" role="status">{found ? t('searchFound', { n: found }) : t('searchNone')}</p>}
    </div>
  )
}
