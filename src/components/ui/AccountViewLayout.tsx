import type { ReactNode } from 'react'
import { AccountGrid, AccountPanel } from './AccountPanel'
import { PanelFeedbackStack } from './PanelFeedbackStack'

type ConfirmationTone = 'default' | 'success'

export function AccountViewLayout({
  children,
  className,
  confirmation,
  confirmationTone,
  error,
  header,
  labelledBy,
  panelId,
}: {
  children: ReactNode
  className?: string
  confirmation?: string
  confirmationTone?: ConfirmationTone
  error?: string
  header: ReactNode
  labelledBy: string
  panelId: string
}) {
  return (
    <AccountPanel className={className} panelId={panelId} labelledBy={labelledBy}>
      {header}

      <PanelFeedbackStack
        confirmation={confirmation}
        confirmationTone={confirmationTone}
        error={error}
      />

      <AccountGrid>{children}</AccountGrid>
    </AccountPanel>
  )
}
