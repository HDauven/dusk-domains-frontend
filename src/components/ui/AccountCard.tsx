import type { ReactNode } from 'react'

export function AccountCard({
  children,
  className = '',
  heading,
  intro,
  title,
}: {
  children?: ReactNode
  className?: string
  heading: ReactNode
  intro?: ReactNode
  title: ReactNode
}) {
  const classes = ['account-card', className].filter(Boolean).join(' ')

  return (
    <article className={classes}>
      <div className="account-card-heading">
        <span>{title}</span>
        <strong>{heading}</strong>
      </div>
      {intro ? <p className="account-card-intro">{intro}</p> : null}
      {children}
    </article>
  )
}

export function AccountDetailList({
  children,
}: {
  children: ReactNode
}) {
  return <div className="account-detail-list">{children}</div>
}

export function AccountDetailItem({
  asCode = false,
  label,
  value,
}: {
  asCode?: boolean
  label: ReactNode
  value: ReactNode
}) {
  return (
    <p>
      <span>{label}</span>
      {asCode ? <code>{value}</code> : <strong>{value}</strong>}
    </p>
  )
}
