import type { DuskDomainTxState } from '../../names/internal'
import { abbreviate } from '../../utils/format'
import { txStatusCopy, txStatusDataAttrs, userFacingTxMessage } from './txStatus'

export function TransactionStatusNotice({
  state,
  className = '',
}: {
  state: DuskDomainTxState
  className?: string
}) {
  const message = userFacingTxMessage(state)
  const reference = state.txId ? abbreviate(state.txId) : ''
  const classNames = ['tx-status', className, state.status].filter(Boolean).join(' ')

  return (
    <div className={classNames} aria-live="polite" {...txStatusDataAttrs(state)}>
      <div>
        <strong>{txStatusCopy(state.status, state.message)}</strong>
        <span>{state.context.title}</span>
      </div>
      {reference ? <span className="tx-reference">Reference {reference}</span> : null}
      {message ? <p>{message}</p> : null}
    </div>
  )
}
