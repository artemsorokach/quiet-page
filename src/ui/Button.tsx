import type { ButtonHTMLAttributes, ComponentChildren } from 'preact'
import './Button.css'

type Variant = 'primary' | 'ghost' | 'quiet' | 'danger'

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'class'> & {
  variant?: Variant
  children: ComponentChildren
}

export function Button({ variant = 'primary', type = 'button', children, ...rest }: ButtonProps) {
  return (
    <button type={type} class={`btn btn--${variant}`} {...rest}>
      {children}
    </button>
  )
}

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'class'> & {
  label: string
  children: ComponentChildren
}

/** Square button with an icon; `label` is announced to screen readers and shown as a tooltip. */
export function IconButton({ label, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} class="icon-btn" aria-label={label} title={label} {...rest}>
      {children}
    </button>
  )
}
