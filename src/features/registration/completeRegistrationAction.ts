import { WalletSessionChangedError } from '../wallet/sessionWriteWallet'
import { premiumDropsSoon } from './premiumTiming'
import {
  createRegistrationCompletionState,
  markRegistrationCompletionFailed,
} from './registrationCompletionState'
import {
  registrationFeeLux,
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

export async function completeRegistration(props: UseRegistrationActionsProps, confirmedTotalLux?: number) {
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

  const workspace = submitNameWrite.captureWorkspace(displayName)
  const preflight = completeRegistrationPreflight(props)
  if (!preflight.ok) {
    if (preflight.step === 'review') setRegistrationStep('review')
    if (preflight.message) setWalletError(preflight.message)
    return
  }
  if (!preparedCommit) return
  if (premiumDropsSoon(props.result, props.lifecycleBaseBlockHeight)
    && confirmedTotalLux !== registrationFeeLux(props.result.label, props.duration, props.feeConfig, props.result.premiumLux ?? 0)) return

  const session = submitNameWrite.captureSession(props.selectedAddress)
  const checkSession = () => { if (!session()) throw new WalletSessionChangedError() }
  setWalletError('')
  setRegistrationCompletion(null)
  try {
    checkSession()
    if (!ensureContractAuthorityForLiveWrite('register this name', setWalletError)) return
    // The purchase step then offers to reserve again instead of a reveal that would fail.
    const missing = await revealCommitmentMissing(props)
    if (!workspace()) return
    checkSession()
    if (missing) {
      setStrandedCommitment({ controller: selectedAuthority, commitment: preparedCommit.commitment })
      return
    }
    const request = createCompleteRegistrationRequest({
      ...props,
      preparedCommit,
    })
    if (!(await ensurePublicBalanceForLiveWrite(
      'registering this name',
      message => { if (workspace()) setWalletError(message) },
    ))) return
    if (!workspace()) return
    checkSession()
    setRegistrationCompletion(createRegistrationCompletionState({
      registrationFee: request.feeLux / 1e9,
      expiryDate: formatLifecycleDay(request.lifecycle.expiresAt, props.lifecycleBaseBlockHeight, Math.floor(Date.now() / 1000)),
    }))

    const finalState = await submitNameWrite(displayName, request.call, {
      workspace,
      session,
      contracts: runtimeConfig.contracts,
      onUpdate: (state) => updateRegistrationCompletion(props, 'complete_registration', state),
    })
    if (!workspace() || !session()) return

    if (finalState.status === 'executed') {
      await applyCompleteRegistrationSuccess(props, {
        finalState,
        request,
        workspace,
      })
    } else {
      await handleCompleteRegistrationEarlyReveal(props, finalState)
    }
  } catch (error) {
    if (!workspace()) return
    const message = userFacingErrorMessage(error)
    setWalletError(message)
    setRegistrationCompletion((current) => markRegistrationCompletionFailed(current, message))
  }
}
