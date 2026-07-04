import type { ReactNode } from 'react'

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
    <div className={className}>
      {icon}
      <span>{children}</span>
    </div>
  )
}
