import type { ComponentPropsWithoutRef } from 'react'

export function Panel({ as: Element = 'section', className = '', loading, ...props }: ComponentPropsWithoutRef<'section'> & {
  as?: 'section' | 'article' | 'div' | 'aside'
  loading?: boolean
}) {
  return <Element {...props} className={`panel ${className}`} aria-busy={loading || undefined} />
}
