import type { RegistrationCompletionState } from '../features/registration/registrationCompletionState'
import type { DuskDomainTxState } from '../names/internal'

export function browserWriteTxStateVisible(
  states: Array<DuskDomainTxState | null>,
  registrationCompletion: RegistrationCompletionState | null,
) {
  if (registrationCompletion) return true
  return states.some((state) => Boolean(state && [
    'submitted',
    'executing',
    'executed',
    'failed',
    'rejected',
    'timeout',
  ].includes(state.status)))
}
