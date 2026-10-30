import './Toast.css'

/** Short confirmation at the bottom of the screen; announced politely to screen readers. */
export function Toast({ message }: { message: string | null }) {
  return (
    <div class={`toast${message ? ' toast--on' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  )
}
