import type { ReactNode } from 'react'

export function PanelHeader({
  actions,
  badge,
  badgeClassName = '',
  headingId,
  subtitle,
  title,
}: {
  actions?: ReactNode
  badge?: ReactNode
  badgeClassName?: string
  headingId: string
  subtitle?: ReactNode
  title: ReactNode
}) {
  const badgeClasses = ['management-badge', badgeClassName].filter(Boolean).join(' ')
  const hasActions = Boolean(badge || actions)

  return (
    <div className="management-header">
      <div>
        <h2 id={headingId}>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      {hasActions ? (
        <div className="management-header-actions">
          {badge ? <span className={badgeClasses}>{badge}</span> : null}
          {actions}
        </div>
      ) : null}
    </div>
  )
}
