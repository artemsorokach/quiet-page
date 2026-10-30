import type { JournalRecord } from '../store/types.ts'
import { additionsOf, historyOf, qaOf, type Addition } from './records.ts'

export interface Change {
  /** null for free text; otherwise the question */
  prompt: string | null
  /** set when the change is in an addition */
  additionAt?: number
  before: string
  after: string
}

export interface Revision {
  /** when this version was replaced */
  at: number
  changes: Change[]
}

/** Each edit as a list of changed parts, newest first. */
export function revisions(record: JournalRecord): Revision[] {
  const history = historyOf(record)
  const steps: Revision[] = []
  history.forEach((before, k) => {
    const after = history[k + 1] ?? { qa: qaOf(record), additions: additionsOf(record) }
    const changes: Change[] = []
    const count = Math.max(before.qa.length, after.qa.length)
    for (let i = 0; i < count; i++) {
      const x = before.qa[i]
      const y = after.qa[i]
      const was = x?.text ?? ''
      const now = y?.text ?? ''
      if (was !== now) changes.push({ prompt: x?.prompt ?? y?.prompt ?? null, before: was, after: now })
    }
    const afterAdds: readonly Addition[] = after.additions ?? []
    for (const added of before.additions ?? []) {
      const now = afterAdds.find((a) => a.at === added.at)?.text ?? ''
      if (added.text !== now) changes.push({ prompt: null, additionAt: added.at, before: added.text, after: now })
    }
    steps.push({ at: before.at, changes })
  })
  return steps.reverse()
}
