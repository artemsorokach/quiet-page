/**
 * Feelings are stored by language-independent key; labels come from the locale's `feelings` list
 * (same order). Older records may hold the Ukrainian word or a person's own word instead.
 */
export const FEELING_KEYS = [
  'calm', 'tired', 'anxious', 'sad', 'grateful', 'joy', 'inspired', 'lonely', 'hope', 'tender',
  'irritated', 'confused', 'relief', 'curious', 'anger', 'fear', 'shame', 'guilt', 'hurt',
  'disappointment', 'emptiness', 'tension', 'contentment', 'warmth', 'pride', 'delight', 'grounded',
] as const

export type FeelingKey = (typeof FEELING_KEYS)[number]

export function isFeelingKey(value: string): value is FeelingKey {
  return (FEELING_KEYS as readonly string[]).includes(value)
}

/** Maps a stored value to its key when known (a key or the Ukrainian label); own words stay as they are. */
export function normalizeFeeling(value: string, ukLabels: readonly string[]): string {
  if (isFeelingKey(value)) return value
  const index = ukLabels.indexOf(value)
  return index >= 0 ? (FEELING_KEYS[index] ?? value) : value
}

export function feelingLabel(value: string, labels: readonly string[], ukLabels: readonly string[]): string {
  const index = (FEELING_KEYS as readonly string[]).indexOf(normalizeFeeling(value, ukLabels))
  return index >= 0 ? (labels[index] ?? value) : value
}
