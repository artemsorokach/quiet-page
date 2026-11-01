import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { dateFormat } from '../../core/journal/dates.ts'
import type { RecentAddition } from '../../core/journal/recent.ts'

interface RecentAdditionsProps {
  items: readonly RecentAddition[]
  /** opens the day the entry was written */
  onOpen: (ts: number) => void
}

/** «Нещодавно доповнено»: entries one returned to this week. They stay in place by date; this only points to them. */
export function RecentAdditions({ items, onOpen }: RecentAdditionsProps) {
  const { t, lang } = useI18n()
  const f = dateFormat(lang)
  if (items.length === 0) return null
  return (
    <div class="recent">
      <p class="recent__label">{t('recentAdded')}</p>
      <ul class="recent__list">
        {items.map(({ record, at, text }) => (
          <li key={record.id}>
            <button type="button" class="recent__item" onClick={() => onOpen(record.ts)}>
              <span class="recent__meta">{t('recentFrom', { day: f.day(record.ts) })} · {t('addition').toLowerCase()} {f.day(at)}</span>
              <span class="recent__text">{text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
