import type { ReactNode } from 'react'

export function AccountPanel({
  children,
  className = '',
  labelledBy,
  panelId,
}: {
  children: ReactNode
  className?: string
  labelledBy: string
  panelId: string
}) {
  const classes = ['account-panel', className].filter(Boolean).join(' ')

  return (
    <section className={classes} id={panelId} aria-labelledby={labelledBy}>
      {children}
    </section>
  )
}

export function AccountGrid({
  children,
}: {
  children: ReactNode
}) {
  return <div className="account-grid">{children}</div>
}
