import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { PanelMessage } from './PanelMessage'

type ConfirmationTone = 'default' | 'success'

export function PanelFeedbackStack({
  confirmation,
  confirmationTone = 'success',
  error,
}: {
  confirmation?: string
  confirmationTone?: ConfirmationTone
  error?: string
}) {
  return (
    <>
      {error ? (
        <PanelMessage icon={<AlertTriangle size={18} />} tone="danger">{error}</PanelMessage>
      ) : null}

      {confirmation ? (
        <PanelMessage
          icon={<CheckCircle2 size={18} />}
          tone={confirmationTone === 'default' ? undefined : confirmationTone}
        >
          {confirmation}
        </PanelMessage>
      ) : null}
    </>
  )
}
