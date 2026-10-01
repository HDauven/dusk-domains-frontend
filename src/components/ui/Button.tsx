import type { ComponentProps } from 'react'

export type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'destructive'
  loading?: boolean
}

export function Button({ variant = 'secondary', loading = false, disabled, className = '', type = 'button', children, ...props }: ButtonProps) {
  return (
    <button {...props} type={type} className={`button button-${variant} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading ? <span className="button-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}
