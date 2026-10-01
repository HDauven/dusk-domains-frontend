import {
  createRegistrationCompletionState,
  markRegistrationCompletionFailed,
} from './registrationCompletionState'
import {
  userFacingErrorMessage,
} from '../../names/internal'
import { formatLifecycleDay } from '../domains/domainFormat'
import { createCompleteRegistrationRequest } from './completeRegistrationCall'
import { handleCompleteRegistrationEarlyReveal } from './completeRegistrationEarlyReveal'
import { completeRegistrationPreflight } from './completeRegistrationPreflight'
import { applyCompleteRegistrationSuccess } from './completeRegistrationSuccess'
import type { UseRegistrationActionsProps } from './registrationActionTypes'
import { updateRegistrationCompletion } from './registrationTxProgress'
import { revealCommitmentMissing } from './strandedReservation'

export async function completeRegistration(props: UseRegistrationActionsProps) {
  const {
    displayName,
    preparedCommit,
    runtimeConfig,
    selectedAuthority,
    setRegistrationCompletion,
    setRegistrationStep,
    setStrandedCommitment,
    setWalletError,
    submitNameWrite,
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
  } = props

  const preflight = completeRegistrationPreflight(props)
  if (!preflight.ok) {
    if (preflight.step === 'review') setRegistrationStep('review')
    if (preflight.message) setWalletError(preflight.message)
    return
  }
  if (!preparedCommit) return

  setWalletError('')
  setRegistrationCompletion(null)
  if (!ensureContractAuthorityForLiveWrite('register this name', setWalletError)) return
  // The purchase step then offers to reserve again instead of a reveal that would fail.
  if (await revealCommitmentMissing(props)) {
    setStrandedCommitment({ controller: selectedAuthority, commitment: preparedCommit.commitment })
    return
  }
  const request = createCompleteRegistrationRequest({
    ...props,
    preparedCommit,
  })
  if (!(await ensurePublicBalanceForLiveWrite(
    'registering this name',
    setWalletError,
    1,
    BigInt(request.feeLux),
  ))) return
  setRegistrationCompletion(createRegistrationCompletionState({
    registrationFee: request.feeLux / 1e9,
    expiryDate: formatLifecycleDay(request.lifecycle.expiresAt, props.lifecycleBaseBlockHeight, Math.floor(Date.now() / 1000)),
  }))

  try {
    const finalState = await submitNameWrite(displayName, request.call, {
      contracts: runtimeConfig.contracts,
      onUpdate: (state) => updateRegistrationCompletion(props, 'complete_registration', state),
    })

    if (finalState.status === 'executed') {
      await applyCompleteRegistrationSuccess(props, {
        finalState,
        request,
      })
    } else {
      await handleCompleteRegistrationEarlyReveal(props, finalState)
    }
  } catch (error) {
    const message = userFacingErrorMessage(error)
    setWalletError(message)
    setRegistrationCompletion((current) => markRegistrationCompletionFailed(current, message))
  }
}
