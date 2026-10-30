import type { ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import './Sheet.css'

interface SheetProps {
  open: boolean
  title: string
  closeLabel: string
  onClose: () => void
  children: ComponentChildren
}

/** Modal bottom sheet on phones, centred panel on wider screens. Uses <dialog> for focus and Esc. */
export function Sheet({ open, title, closeLabel, onClose, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      class="sheet"
      aria-labelledby="sheet-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      <div class="sheet__body">
        <div class="sheet__head">
          <h2 class="sheet__title" id="sheet-title">{title}</h2>
          <button type="button" class="sheet__close" aria-label={closeLabel} onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
