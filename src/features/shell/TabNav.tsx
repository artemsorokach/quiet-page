import './TabNav.css'

export type Tab = 'write' | 'path' | 'share'

interface TabNavProps {
  current: Tab
  labels: Record<Tab, string>
  navLabel: string
  onSelect: (tab: Tab) => void
}

const TABS: readonly Tab[] = ['write', 'path', 'share']

export function TabNav({ current, labels, navLabel, onSelect }: TabNavProps) {
  return (
    <nav class="tab-nav" aria-label={navLabel}>
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          class="tab-nav__tab"
          aria-current={current === tab ? 'page' : undefined}
          onClick={() => onSelect(tab)}
        >
          {labels[tab]}
        </button>
      ))}
    </nav>
  )
}
