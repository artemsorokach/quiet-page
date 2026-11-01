import { useCallback, useRef } from 'preact/hooks'

/**
 * Adds `is-shown` once the element scrolls into view, so it can appear softly (see Welcome.css).
 * A callback ref: it also works when the element appears again (after the welcome page, say).
 */
export function useRevealOnScroll<T extends HTMLElement>(): (element: T | null) => void {
  const observer = useRef<IntersectionObserver | null>(null)
  return useCallback((element: T | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') {
      element.classList.add('is-shown')
      return
    }
    const watch = new IntersectionObserver((items) => {
      if (items.some((item) => item.isIntersecting)) {
        element.classList.add('is-shown')
        watch.disconnect()
      }
    })
    watch.observe(element)
    observer.current = watch
  }, [])
}
