import { useEffect, useRef } from 'preact/hooks'

/** Adds `is-shown` once the element scrolls into view, so it can appear softly (see Welcome.css). */
export function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') {
      element.classList.add('is-shown')
      return
    }
    const observer = new IntersectionObserver((items) => {
      if (items.some((item) => item.isIntersecting)) {
        element.classList.add('is-shown')
        observer.disconnect()
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return ref
}
