import { ActionFeedback } from '../../components/ui/ActionFeedback'
import type { DuskDomainTxState } from '../../names/internal'

export function ManagementFeedback({ error, txState }: { error?: string; txState: DuskDomainTxState | null }) {
  return <ActionFeedback error={error} state={txState} />
}
