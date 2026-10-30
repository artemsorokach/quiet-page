import { IconButton } from '../../ui/Button.tsx'
import { MarkIcon, SettingsIcon } from '../../ui/icons.tsx'
import './AppHeader.css'

interface AppHeaderProps {
  appName: string
  onBrand: () => void
  settingsLabel: string
  onOpenSettings: () => void
}

export function AppHeader({ appName, settingsLabel, onBrand, onOpenSettings }: AppHeaderProps) {
  return (
    <header class="app-header">
      <h1 class="app-header__brand">
        <button type="button" class="app-header__brand-btn" onClick={onBrand}>
          <span class="app-header__mark">
            <MarkIcon />
          </span>
          {appName}
        </button>
      </h1>
      <div class="app-header__actions">
        <IconButton label={settingsLabel} onClick={onOpenSettings}>
          <SettingsIcon />
        </IconButton>
      </div>
    </header>
  )
}
