import { AlertTriangle, ArrowRight, Check, Clock } from 'lucide-react'
import { abbreviate } from '../../utils/format'
import type { RegistrationCompletionState, RegistrationCompletionStepStatus } from './registrationCompletionState'

function registrationStepIcon(status: RegistrationCompletionStepStatus) {
  if (status === 'executed') return <Check size={16} />
  if (status === 'failed') return <AlertTriangle size={16} />
  return <Clock size={16} />
}

function registrationProgressTitle(status: RegistrationCompletionState['status']) {
  if (status === 'executed') return 'Registration complete'
  if (status === 'failed') return 'Registration needs attention'
  return 'Completing registration'
}

function registrationProgressCopy(status: RegistrationCompletionState['status']) {
  if (status === 'executed') return 'Your domain is active.'
  if (status === 'failed') return 'The name is still reserved. Retry when the issue is fixed.'
  return 'Keep the wallet open while this finishes.'
}

export function RegistrationCompletionProgress({
  progress,
  onSetAddress,
}: {
  progress: RegistrationCompletionState
  onSetAddress: () => void
}) {
  return (
    <div className={`registration-progress ${progress.status}`} aria-live="polite">
      <div className="registration-progress-header">
        <strong>{registrationProgressTitle(progress.status)}</strong>
        <span>{registrationProgressCopy(progress.status)}</span>
      </div>

      <ol>
        {progress.steps.map((step) => (
          <li className={step.status} key={step.id}>
            {registrationStepIcon(step.status)}
            <div>
              <strong>{step.title}</strong>
              <span>{step.message ?? step.description}</span>
              {step.txId ? <code>{abbreviate(step.txId)}</code> : null}
            </div>
          </li>
        ))}
      </ol>

      {progress.status === 'executed' ? (
        <button className="primary-button compact" type="button" onClick={onSetAddress}>
          Open domain
          <ArrowRight size={18} />
        </button>
      ) : null}
    </div>
  )
}
