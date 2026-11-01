import { useState } from 'preact/hooks'
import './FeelingsPicker.css'

export interface FeelingOption {
  key: string
  label: string
}

interface FeelingsPickerProps {
  options: readonly FeelingOption[]
  /** the person's own words, shown after the listed feelings */
  own: readonly string[]
  value: readonly string[]
  labels: { add: string; hide: string; prefix: string; own: string; ownPlaceholder: string; ownAdd: string; ownRemove: string }
  onChange: (feelings: string[]) => void
  /** turns a typed word into the stored value (a key or the word); '' when empty */
  onAddOwn: (word: string) => string
  onHideOwn: (word: string) => void
}

/** Collapsed by default: «+ Почуття». Open, it shows all feelings as toggle chips and «+ своє». */
export function FeelingsPicker({ options, own, value, labels, onChange, onAddOwn, onHideOwn }: FeelingsPickerProps) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [word, setWord] = useState('')
  const labelOf = (key: string) => options.find((o) => o.key === key)?.label ?? key
  const summary = value.length ? `${labels.prefix}${value.map(labelOf).join(', ')}` : labels.add

  const toggle = (feeling: string) =>
    onChange(value.includes(feeling) ? value.filter((f) => f !== feeling) : [...value, feeling])

  function commit() {
    const added = onAddOwn(word)
    setWord('')
    setAdding(false)
    if (added && !value.includes(added)) onChange([...value, added])
  }

  return (
    <div class="feelings">
      <button type="button" class="feelings__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? labels.hide : summary}
      </button>
      {open && (
        <div class="feelings__list" role="group" aria-label={labels.add}>
          {options.map((option) => (
            <button key={option.key} type="button" class="feelings__chip" aria-pressed={value.includes(option.key)} onClick={() => toggle(option.key)}>
              {option.label}
            </button>
          ))}
          {own.map((w) => (
            <span key={`own-${w}`} class="feelings__own">
              <button type="button" class="feelings__chip feelings__chip--own" aria-pressed={value.includes(w)} onClick={() => toggle(w)}>
                {w}
              </button>
              <button
                type="button"
                class="feelings__remove"
                aria-label={`${labels.ownRemove}: ${w}`}
                onClick={() => {
                  onHideOwn(w)
                  if (value.includes(w)) onChange(value.filter((f) => f !== w))
                }}
              >
                ×
              </button>
            </span>
          ))}
          {adding ? (
            <form
              class="feelings__form"
              onSubmit={(e) => {
                e.preventDefault()
                commit()
              }}
            >
              <input
                class="feelings__input"
                type="text"
                maxLength={40}
                value={word}
                aria-label={labels.own}
                placeholder={labels.ownPlaceholder}
                ref={(el) => el?.focus({ preventScroll: true })}
                onInput={(e) => setWord((e.currentTarget as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setWord('')
                    setAdding(false)
                  }
                }}
              />
              <button type="submit" class="feelings__chip">{labels.ownAdd}</button>
            </form>
          ) : (
            <button type="button" class="feelings__chip feelings__chip--ghost" onClick={() => setAdding(true)}>
              {labels.own}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
