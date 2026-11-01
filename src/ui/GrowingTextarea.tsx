import type { TextareaHTMLAttributes } from 'preact'
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks'
import './GrowingTextarea.css'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'ref'> & {
  value: string
  /** focus the field when it appears (without scrolling) */
  focusOnMount?: boolean
}

const MIN_HEIGHT = 80

/**
 * A text field that grows as the person writes (no length limit), and can be pulled taller or
 * shorter by its quiet corner mark — with a finger too, which the browser's own handle can't do
 * on phones. It never shrinks while typing, so a size the person chose is kept.
 */
export function GrowingTextarea({ focusOnMount, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const drag = useRef<{ y: number; h: number } | null>(null)

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

  const onPointerDown = (e: PointerEvent) => {
    const el = ref.current
    if (!el) return
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, h: el.offsetHeight }
  }
  const onPointerMove = (e: PointerEvent) => {
    const el = ref.current
    if (!el || !drag.current) return
    el.style.height = `${Math.max(MIN_HEIGHT, drag.current.h + e.clientY - drag.current.y)}px`
  }
  const onPointerUp = () => {
    drag.current = null
  }

  return (
    <span class="grow-field">
      <textarea ref={ref} {...props} />
      <span
        class="grow-field__handle"
        aria-hidden="true"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </span>
  )
}
