import { useState } from 'preact/hooks'
import './FeelingsPicker.css'

export interface FeelingOption {
  key: string
  label: string
}

interface FeelingsPickerProps {
  options: readonly FeelingOption[]
  value: readonly string[]
  labels: { add: string; hide: string; prefix: string }
  onChange: (feelings: string[]) => void
}

/** Collapsed by default: «+ Почуття». Open, it shows all feelings as toggle chips. */
export function FeelingsPicker({ options, value, labels, onChange }: FeelingsPickerProps) {
  const [open, setOpen] = useState(false)
  const labelOf = (key: string) => options.find((o) => o.key === key)?.label ?? key
  const summary = value.length ? `${labels.prefix}${value.map(labelOf).join(', ')}` : labels.add

  const toggle = (feeling: string) =>
    onChange(value.includes(feeling) ? value.filter((f) => f !== feeling) : [...value, feeling])

  return (
    <div class="feelings">
      <button type="button" class="feelings__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? labels.hide : summary}
      </button>
      {open && (
        <div class="feelings__list" role="group" aria-label={labels.add}>
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              class="feelings__chip"
              aria-pressed={value.includes(option.key)}
              onClick={() => toggle(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
