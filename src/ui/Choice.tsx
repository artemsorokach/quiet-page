import type { ComponentChildren } from 'preact'
import './Choice.css'

interface Option<T extends string> {
  value: T
  label: ComponentChildren
  note?: ComponentChildren
}

/** A column of radio cards. */
export function RadioOptions<T extends string>({ name, value, options, onChange }: {
  name: string
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
}) {
  return (
    <div class="options" role="radiogroup">
      {options.map((option) => (
        <label class="option" key={option.value}>
          <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
          <span>{option.label}</span>
          {option.note !== undefined && <small>{option.note}</small>}
        </label>
      ))}
    </div>
  )
}

/** Pill-shaped switch between a few options. `value` may match none (after manual changes). */
export function Segmented<T extends string>({ value, options, label, onChange }: {
  value: T | null
  options: readonly Option<T>[]
  label: string
  onChange: (value: T) => void
}) {
  return (
    <div class="segmented" role="group" aria-label={label} style={{ '--count': options.length }}>
      {options.map((option) => (
        <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}
