import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { BookmarkIcon, SearchIcon } from '../../ui/icons.tsx'

export type PathTool = 'search' | 'review' | 'important'

interface PathToolsProps {
  value: PathTool | null
  onChange: (tool: PathTool | null) => void
}

/** «Пошук · Огляд · Важливе»: each opens on tap and closes on a second tap. */
export function PathTools({ value, onChange }: PathToolsProps) {
  const { t } = useI18n()
  const tools: { id: PathTool; label: string; icon?: preact.JSX.Element }[] = [
    { id: 'search', label: t('toolSearch'), icon: <SearchIcon /> },
    { id: 'review', label: t('toolReview') },
    { id: 'important', label: t('important'), icon: <BookmarkIcon /> },
  ]
  return (
    <div class="path-tools" role="group" aria-label={t('toolsLabel')}>
      {tools.map((tool) => (
        <button key={tool.id} type="button" class="path-tools__btn" aria-pressed={value === tool.id} onClick={() => onChange(value === tool.id ? null : tool.id)}>
          {tool.icon}
          {tool.label}
        </button>
      ))}
    </div>
  )
}
