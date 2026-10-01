import { Badge } from './Badge'
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
  const hasActions = Boolean(badge || actions)

  return (
    <div className="management-header">
      <div>
        <h2 id={headingId}>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      {hasActions ? (
        <div className="management-header-actions">
          {badge ? <Badge tone={badgeClassName === 'verified' ? 'success' : badgeClassName === 'warning' ? 'warning' : 'neutral'}>{badge}</Badge> : null}
          {actions}
        </div>
      ) : null}
    </div>
  )
}
