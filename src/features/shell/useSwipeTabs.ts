import { useEffect, useRef } from 'preact/hooks'

const MIN_DISTANCE = 70
const MAX_DURATION_MS = 700
const EDGE = 28
/** Places where a sideways swipe means something else, or where the person is writing. */
const IGNORE = 'textarea, input, select, [contenteditable], dialog, .calendar, .week, .entry__editor, .pick-list'

/**
 * A clear sideways swipe moves between «Сторінка · Шлях · Поділитися». It never fires while
 * writing, inside sheets or the calendar, or from the screen edges (the phone's own back gesture).
 */
export function useSwipeTabs(enabled: boolean, onSwipe: (direction: 'next' | 'prev') => void) {
  const handler = useRef(onSwipe)
  handler.current = onSwipe

  useEffect(() => {
    if (!enabled) return
    let start: { x: number; y: number; t: number } | null = null
    const writing = () => {
      const active = document.activeElement
      return active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement || document.body.classList.contains('writing')
    }
    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      const target = e.target as Element | null
      start = null
      if (e.touches.length !== 1 || !touch || writing() || target?.closest(IGNORE)) return
      if (touch.clientX < EDGE || touch.clientX > window.innerWidth - EDGE) return
      start = { x: touch.clientX, y: touch.clientY, t: Date.now() }
    }
    const onEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0]
      if (!start || !touch) return
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      const quick = Date.now() - start.t <= MAX_DURATION_MS
      start = null
      if (!quick || Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 2) return
      handler.current(dx < 0 ? 'next' : 'prev')
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchend', onEnd)
    }
  }, [enabled])
}
