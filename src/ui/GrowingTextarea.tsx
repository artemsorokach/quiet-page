import type { TextareaHTMLAttributes } from 'preact'
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks'
import './GrowingTextarea.css'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'ref'> & {
  value: string
  /** focus the field when it appears (without scrolling) */
  focusOnMount?: boolean
}

/**
 * A text field that grows as the person writes, so there is no length limit to bump into and
 * nothing has to be dragged. It can still be pulled taller by its quiet corner mark; it never
 * shrinks while typing, so a size the person chose is kept.
 */
export function GrowingTextarea({ focusOnMount, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (!el.value) {
      el.style.height = ''
      return
    }
    if (el.scrollHeight > el.clientHeight) el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`
  }, [props.value])

  useEffect(() => {
    if (focusOnMount) ref.current?.focus({ preventScroll: true })
  }, [])

  return (
    <span class="grow-field">
      <textarea ref={ref} {...props} />
    </span>
  )
}
