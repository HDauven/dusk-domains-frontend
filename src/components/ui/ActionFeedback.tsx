import type { DuskDomainTxState } from '../../names/internal'
import { txStatusCopy, txStatusDataAttrs, userFacingTxMessage } from '../status/txStatus'

/** One in-place result per action. Transaction references stay behind Details. */
export function ActionFeedback({ error, state }: { error?: string; state: DuskDomainTxState | null }) {
  if (error) return <p className="secure-note danger" role="alert">{error}</p>
  if (!state) return null
  return <div className={`tx-status ${state.status}`} role="status" {...txStatusDataAttrs(state)}>
    <strong key={state.status}>{txStatusCopy(state.status, state.message)}</strong>
    {state.status !== 'executed' && userFacingTxMessage(state) ? <p>{userFacingTxMessage(state)}</p> : null}
    {state.txId ? <details><summary>Details</summary><p>{state.context.title}</p><code>{state.txId}</code></details> : null}
  </div>
}
