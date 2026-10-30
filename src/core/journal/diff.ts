/** Word-level diff used to show what changed when an entry was edited. */
export type DiffOp = { kind: 'same' | 'removed' | 'added'; text: string }

const MAX_CELLS = 250_000
const tokens = (text: string) => text.split(/(\s+)/).filter((part) => part !== '')
const isSpace = (text: string) => /^\s+$/.test(text)

export function diffWords(before: string, after: string): DiffOp[] {
  const a = tokens(before)
  const b = tokens(after)
  if (a.length * b.length > MAX_CELLS) {
    return [
      { kind: 'removed', text: before },
      { kind: 'added', text: after },
    ]
  }
  const lcs = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!)
    }
  }
  const ops: DiffOp[] = []
  const push = (kind: DiffOp['kind'], text: string) => {
    const last = ops[ops.length - 1]
    if (last && last.kind === kind) ops[ops.length - 1] = { kind, text: last.text + text }
    else ops.push({ kind, text })
  }
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push('same', a[i]!)
      i++
      j++
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) push('removed', a[i++]!)
    else push('added', b[j++]!)
  }
  while (i < a.length) push('removed', a[i++]!)
  while (j < b.length) push('added', b[j++]!)
  return ops
}

export interface Span {
  text: string
  marked: boolean
}

/**
 * One side of the diff: "before" keeps same + removed words and marks the removed ones,
 * "after" keeps same + added and marks the added. Spaces between two marked words stay marked.
 */
export function diffSide(ops: readonly DiffOp[], side: 'before' | 'after'): Span[] {
  const skip = side === 'before' ? 'added' : 'removed'
  const mark = side === 'before' ? 'removed' : 'added'
  const parts = ops.filter((op) => op.kind !== skip)
  const spans: Span[] = []
  parts.forEach((op, index) => {
    const prev = parts[index - 1]
    const next = parts[index + 1]
    const marked = op.kind === mark || (isSpace(op.text) && prev?.kind === mark && next?.kind === mark)
    const last = spans[spans.length - 1]
    if (last && last.marked === marked) spans[spans.length - 1] = { text: last.text + op.text, marked }
    else spans.push({ text: op.text, marked })
  })
  return spans
}
