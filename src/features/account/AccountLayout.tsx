import type { ComponentChildren, InputHTMLAttributes } from 'preact'
import { useState } from 'preact/hooks'
import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { EyeIcon, EyeOffIcon, MarkIcon } from '../../ui/icons.tsx'
import './AccountLayout.css'

interface AccountLayoutProps {
  /** a quiet line above the title, e.g. «Вхід через Google виконано» */
  kicker?: string
  title: string
  lead?: string
  note?: string
  children: ComponentChildren
  footer?: ComponentChildren
}

/** Quiet single-column screen for sign-in, password and recovery steps. */
export function AccountLayout({ kicker, title, lead, note, children, footer }: AccountLayoutProps) {
  return (
    <section class="account" aria-labelledby="account-title">
      <span class="account__mark">
        <MarkIcon />
      </span>
      {kicker && <p class="account__kicker">{kicker}</p>}
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
  /** a quiet line under the field */
  hint?: string
  onInput: (value: string) => void
}

/** Text input with a visually hidden label (the placeholder repeats it). */
export function Field({ id, label, type = 'text', value, autoComplete, code, hint, onInput }: FieldProps) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  // Preact 11 narrows <input> props per `type`; this field supports three text-like types.
  const inputProps = {
    id,
    class: code ? 'account__input account__input--code' : 'account__input',
    type: isPassword && shown ? 'text' : type,
    'aria-describedby': hint ? `${id}-hint` : undefined,
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
      {isPassword ? (
        <span class="account__secret">
          <input {...inputProps} />
          {/* The eye shows the whole password while pressed on; the input keeps its value either way */}
          <button
            type="button" class="account__eye" aria-controls={id} aria-pressed={shown}
            aria-label={t(shown ? 'pwHide' : 'pwShow')} onClick={() => setShown(!shown)}
          >
            {shown ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </span>
      ) : (
        <input {...inputProps} />
      )}
      {hint && <p class="account__hint" id={`${id}-hint`}>{hint}</p>}
    </>
  )
}
