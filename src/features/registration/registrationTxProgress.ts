import { userFacingTxMessage } from '../../components/status/txStatus'
import type { DuskDomainTxState } from '../../names/internal'
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
  state: DuskDomainTxState,
) {
  setTxState(state)
  // A node receipt carries the contract's raw failure, such as DuskDS:v1:CommitmentAge; say it in words.
  const shown = state.message ? { ...state, message: userFacingTxMessage(state) } : state
  setRegistrationCompletion((current) => updateRegistrationCompletionState(current, step, shown))
}
