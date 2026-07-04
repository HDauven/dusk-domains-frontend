import type { AppViewModelInputs } from '../appViewTypes'

export function buildRegistrationRuntimeProps({
  derivedState,
  registrationRuntime,
}: AppViewModelInputs) {
  const {
    canContinueRegistrationStep,
    loadPendingReservations,
    refreshCommitBlockState,
    registrationNextStep,
    registrationPreviousStep,
    registrationStepDescription,
    registrationTargetAddress,
    registrationTargetAddressErrors,
    registrationTargetReady,
  } = registrationRuntime
  const {
    canPrepareCommit,
    canRevealRegistration,
    commitBusy,
    commitStale,
    commitWindow,
    txBusy,
  } = derivedState

  return {
    canContinueRegistrationStep,
    canPrepareCommit,
    canRevealRegistration,
    commitBusy,
    commitStale,
    commitWindow,
    loadPendingReservations,
    refreshCommitBlockState,
    registrationNextStep,
    registrationPreviousStep,
    registrationStepDescription,
    registrationTargetAddress,
    registrationTargetAddressErrors,
    registrationTargetReady,
    txBusy,
  }
}
