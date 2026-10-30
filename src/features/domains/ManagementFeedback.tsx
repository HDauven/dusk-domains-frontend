import { ActionFeedback } from '../../components/ui/ActionFeedback'
import type { DuskDomainTxState } from '../../names/internal'

export function ManagementFeedback({ error, txState, onDismiss }: { error?: string; txState: DuskDomainTxState | null; onDismiss?: () => void }) {
  return <ActionFeedback error={error} state={txState} onDismiss={onDismiss} />
}
