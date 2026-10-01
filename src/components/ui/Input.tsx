import type { ComponentProps } from 'react'

type FieldState = { loading?: boolean }

export function Input({ className = '', loading, disabled, ...props }: ComponentProps<'input'> & FieldState) {
  return <input {...props} className={`input ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} />
}

export function Select({ className = '', loading, disabled, ...props }: ComponentProps<'select'> & FieldState) {
  return <select {...props} className={`input ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} />
}

export function Textarea({ className = '', loading, disabled, ...props }: ComponentProps<'textarea'> & FieldState) {
  return <textarea {...props} className={`input ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} />
}
