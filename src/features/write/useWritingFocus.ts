import { useEffect, useRef } from 'preact/hooks'

const START_AFTER_MS = 700

/**
 * While the person types, the rest of the page fades (body.writing); it comes back as soon as
 * the text fields lose focus. Optional (Settings → «Ховати зайве, коли пишу»).
 */
export function useWritingFocus(enabled: boolean) {
  const timer = useRef<number | undefined>(undefined)
  const stop = () => {
    window.clearTimeout(timer.current)
    document.body.classList.remove('writing')
  }
  useEffect(() => stop, [])
  useEffect(() => {
    if (!enabled) stop()
  }, [enabled])

  return {
    onInput: () => {
      if (!enabled) return
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => document.body.classList.add('writing'), START_AFTER_MS)
    },
    onFocusOut: (event: FocusEvent) => {
      const area = event.currentTarget as HTMLElement
      window.setTimeout(() => {
        if (!area.contains(document.activeElement)) stop()
      }, 50)
    },
    stop,
  }
}
