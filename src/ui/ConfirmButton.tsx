import { useEffect, useRef, useState } from 'preact/hooks'

interface ConfirmButtonProps {
  label: string
  confirmLabel: string
  class?: string
  onConfirm: () => void
}

const DISARM_AFTER_MS = 4000

/** Destructive action that needs a second tap within a few seconds. */
export function ConfirmButton({ label, confirmLabel, class: className = 'link-btn link-btn--danger', onConfirm }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <button
      type="button"
      class={className}
      onClick={() => {
        if (!armed) {
          setArmed(true)
          timer.current = window.setTimeout(() => setArmed(false), DISARM_AFTER_MS)
          return
        }
        window.clearTimeout(timer.current)
        setArmed(false)
        onConfirm()
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  )
}
