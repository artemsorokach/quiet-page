import './MoodScale.css'

export type Mood = 1 | 2 | 3 | 4 | 5

interface MoodScaleProps {
  /** Five words from low to high, e.g. «Важко … Світло» */
  words: readonly string[]
  value: Mood | null
  legend: string
  onChange: (mood: Mood | null) => void
}

const MOODS: readonly Mood[] = [1, 2, 3, 4, 5]

/** Five-point mood choice. A second tap on the chosen point clears it. */
export function MoodScale({ words, value, legend, onChange }: MoodScaleProps) {
  return (
    <fieldset class="mood-scale">
      <legend class="mood-scale__legend">{legend}</legend>
      <div class="mood-scale__options">
        {MOODS.map((mood) => (
          <button
            key={mood}
            type="button"
            class="mood-scale__option"
            aria-pressed={value === mood}
            onClick={() => onChange(value === mood ? null : mood)}
          >
            <span class={`mood-scale__dot mood-scale__dot--${mood}`} aria-hidden="true" />
            <span class="mood-scale__word">{words[mood - 1]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
