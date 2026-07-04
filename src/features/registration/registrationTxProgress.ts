import type { DuskNameTxState } from '../../names/internal'
import type { UseRegistrationActionsProps } from './registrationActionTypes'
import {
  updateRegistrationCompletionState,
  type RegistrationCompletionStepId,
} from './registrationCompletionState'

export function updateRegistrationCompletion(
  {
    setRegistrationCompletion,
    setTxState,
  }: UseRegistrationActionsProps,
  step: RegistrationCompletionStepId,
  state: DuskNameTxState,
) {
  setTxState(state)
  setRegistrationCompletion((current) => updateRegistrationCompletionState(current, step, state))
}
