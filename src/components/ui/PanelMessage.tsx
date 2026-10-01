import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

type PanelMessageTone = 'default' | 'danger' | 'success' | 'subtle'

export function PanelMessage({
  children,
  icon,
  tone = 'default',
}: {
  children: ReactNode
  icon: ReactNode
  tone?: PanelMessageTone
}) {
  const className = tone === 'default' ? 'activity-empty' : `activity-empty ${tone}`

  return (
    <EmptyState className={className} icon={icon}>{children}</EmptyState>
  )
}
