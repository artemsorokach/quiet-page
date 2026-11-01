import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { deviceDraftKey } from '../../core/draft/deviceDraftKey.ts'
import { EMPTY_DRAFT, createDraftStore, type Draft } from '../../core/draft/draft.ts'

const SAVE_AFTER_MS = 500

/**
 * The text on «Сторінка» before «Зберегти»: kept in memory while the app is open (so switching
 * tabs loses nothing) and, for `scope`, sealed on this device so it survives closing the app.
 * `scope` is null in the example, where nothing is kept. A signed-in person who started writing
 * before signing in finds that text again.
 */
export function useDraft(scope: string | null) {
  const store = useMemo(() => createDraftStore(deviceDraftKey, localStorage), [])
  const current = useRef<Draft>(EMPTY_DRAFT)
  const timer = useRef<number | undefined>(undefined)
  const [ready, setReady] = useState(false)

  const flush = () => {
    window.clearTimeout(timer.current)
    if (scope) void store.save(scope, current.current)
  }

  useEffect(() => {
    let alive = true
    setReady(false)
    current.current = EMPTY_DRAFT
    if (!scope) {
      setReady(true)
      return
    }
    void (async () => {
      let draft = await store.load(scope)
      if (!draft && scope !== 'local') {
        draft = await store.load('local')
        if (draft) {
          await store.save(scope, draft)
          await store.clear('local')
        }
      }
      if (!alive) return
      current.current = draft ?? EMPTY_DRAFT
      setReady(true)
    })()
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [scope])

  return {
    ready,
    current: () => current.current,
    update(partial: Partial<Draft>) {
      current.current = { ...current.current, ...partial }
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, SAVE_AFTER_MS)
    },
    clear() {
      window.clearTimeout(timer.current)
      current.current = EMPTY_DRAFT
      if (scope) void store.clear(scope)
    },
  }
}
