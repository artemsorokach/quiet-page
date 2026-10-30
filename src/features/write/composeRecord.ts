import type { JournalRecord, QuestionAnswer } from '../../core/store/types.ts'

export interface WriteForm {
  mood: number | null
  scale: string
  feelings: readonly string[]
  /** null when the question is hidden */
  question: { text: string; index: number } | null
  answer: string
  free: string
  lang: string
}

const ID_RANDOM_CHARS = 4

export function newRecordId(now: number): string {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(ID_RANDOM_CHARS)), (b) => (b % 36).toString(36)).join('')
  return `e${now.toString(36)}${random}`
}

/** Turns what is on the page into a record to save, or null when nothing was filled in. */
export function composeRecord(form: WriteForm, id: string, now: number): JournalRecord | null {
  const qa: QuestionAnswer[] = []
  const answer = form.answer.trim()
  const free = form.free.trim()
  if (form.question && answer) qa.push({ prompt: form.question.text, qi: form.question.index, text: answer })
  if (free) qa.push({ prompt: null, text: free })

  if (qa.length === 0) {
    if (form.mood === null && form.feelings.length === 0) return null
    return { id, type: 'check', ts: now, mood: form.mood, scale: form.scale, feelings: [...form.feelings] }
  }

  return {
    id,
    ts: now,
    mood: form.mood,
    scale: form.scale,
    feelings: [...form.feelings],
    qa,
    text: qa.map((item) => item.text).join('\n\n'),
    prompt: qa[0]?.prompt ?? null,
    lang: form.lang,
  }
}
