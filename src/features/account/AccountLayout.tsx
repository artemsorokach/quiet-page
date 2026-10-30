import type { ComponentChildren, InputHTMLAttributes } from 'preact'
import { MarkIcon } from '../../ui/icons.tsx'
import './AccountLayout.css'

interface AccountLayoutProps {
  title: string
  lead?: string
  note?: string
  children: ComponentChildren
  footer?: ComponentChildren
}

/** Quiet single-column screen for sign-in, password and recovery steps. */
export function AccountLayout({ title, lead, note, children, footer }: AccountLayoutProps) {
  return (
    <section class="account" aria-labelledby="account-title">
      <span class="account__mark">
        <MarkIcon />
      </span>
      <h2 class="account__title" id="account-title">{title}</h2>
      {lead && <p class="account__lead">{lead}</p>}
      {note && <p class="account__note">{note}</p>}
      {children}
      {footer && <div class="account__footer">{footer}</div>}
    </section>
  )
}

interface FieldProps {
  id: string
  label: string
  type?: 'email' | 'password' | 'text'
  value: string
  autoComplete?: string
  code?: boolean
  onInput: (value: string) => void
}

/** Text input with a visually hidden label (the placeholder repeats it). */
export function Field({ id, label, type = 'text', value, autoComplete, code, onInput }: FieldProps) {
  // Preact 11 narrows <input> props per `type`; this field supports three text-like types.
  const inputProps = {
    id,
    class: code ? 'account__input account__input--code' : 'account__input',
    type,
    value,
    placeholder: label,
    autoComplete,
    autoCapitalize: code ? 'characters' : 'off',
    spellcheck: false,
    onInput: (event: Event) => onInput((event.currentTarget as HTMLInputElement).value),
  } as InputHTMLAttributes<HTMLInputElement>
  return (
    <>
      <label class="sr-only" for={id}>{label}</label>
      <input {...inputProps} />
    </>
  )
}
