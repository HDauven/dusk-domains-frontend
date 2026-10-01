import type { ReactNode } from 'react'

export function EmptyState({ title, children, icon, action, loading = false, className = '' }: {
  title?: string
  children?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  loading?: boolean
  className?: string
}) {
  return (
    <div className={`empty-state ${className}`} aria-busy={loading || undefined} role={loading ? 'status' : undefined}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <div>{title ? <h2>{title}</h2> : null}{children ? <div>{children}</div> : null}{action}</div>
    </div>
  )
}
