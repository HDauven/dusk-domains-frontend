import type { ReactNode } from 'react'

export function PanelHeader({
  actions,
  badge,
  badgeClassName = '',
  backLabel,
  headingId,
  onBack,
  subtitle,
  title,
}: {
  actions?: ReactNode
  badge?: ReactNode
  badgeClassName?: string
  backLabel?: string
  headingId: string
  onBack?: () => void
  subtitle?: ReactNode
  title: ReactNode
}) {
  const badgeClasses = ['management-badge', badgeClassName].filter(Boolean).join(' ')
  const hasActions = Boolean(badge || actions || onBack)

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
          {onBack ? (
            <button className="commit-button" type="button" onClick={onBack}>
              {backLabel ?? 'Back'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
