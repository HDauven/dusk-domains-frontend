import { ConfirmationRetry } from '../../components/status/ConfirmationRetry'
import type { DuskDomainTxState } from '../../names/internal'
import { Button } from '../../components/ui/Button'
import type { RegistrationCompletionState } from './registrationCompletionState'

export function RegistrationCompletionProgress({ progress, onSetAddress, txState }: {
  txState?: DuskDomainTxState | null
  progress: RegistrationCompletionState
  onSetAddress: () => void
}) {
  const syncing = progress.status === 'running' && progress.steps.every(step => step.status === 'executed')
  return <div className={`registration-progress ${progress.status}`} role="status">
    <strong>{progress.status === 'executed' ? 'Registration complete' : progress.status === 'failed' ? 'Registration needs attention' : syncing || txState?.message === 'Still confirming…' ? 'Still confirming…' : 'Registering…'}</strong>
    <p>{progress.status === 'failed' ? progress.message ?? 'Your reservation is saved. Retry when the issue is fixed.' : syncing ? 'Your transaction was submitted. Waiting for the name to appear.' : progress.status === 'running' ? txState?.txId ? 'Waiting for the network to confirm your registration.' : 'Confirm in your wallet and keep it open while this finishes.' : null}</p>
    {progress.steps.some(step => step.txId) ? <details><summary>Details</summary>{progress.steps.filter(step => step.txId).map(step => <code key={step.id}>{step.txId}</code>)}</details> : null}
    <ConfirmationRetry state={txState} />
    {progress.status === 'executed' ? <Button variant="primary" onClick={onSetAddress}>Open name</Button> : null}
  </div>
}
