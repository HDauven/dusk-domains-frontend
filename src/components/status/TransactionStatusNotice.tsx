import type { DuskDomainTxState } from '../../names/internal'
import { ConfirmationRetry } from './ConfirmationRetry'
import { txStatusCopy, txStatusDataAttrs, userFacingTxMessage } from './txStatus'

export function TransactionStatusNotice({
  state,
  className = '',
}: {
  state: DuskDomainTxState
  className?: string
}) {
  const message = userFacingTxMessage(state)
  const classNames = ['tx-status', className, state.status].filter(Boolean).join(' ')

  return (
    <div className={classNames} aria-live="polite" {...txStatusDataAttrs(state)}>
      <div>
        <strong>{txStatusCopy(state.status, state.message)}</strong>
        <span>{state.context.title}</span>
      </div>
      {state.txId ? <details><summary>Details</summary><p>Transaction <code>{state.txId}</code></p></details> : null}
      <ConfirmationRetry state={state} />
      {message && message !== 'Still confirming…' ? <p>{message}</p> : null}
    </div>
  )
}
