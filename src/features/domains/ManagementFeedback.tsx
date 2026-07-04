import { TransactionStatusNotice } from '../../components/status/TransactionStatusNotice'
import type { DuskNameTxState } from '../../names/internal'

export function ManagementFeedback({
  error,
  txState,
}: {
  error?: string
  txState: DuskNameTxState | null
}) {
  return (
    <>
      {txState ? (
        <TransactionStatusNotice className="management" state={txState} />
      ) : null}

      {error ? <p className="secure-note danger">{error}</p> : null}
    </>
  )
}
