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
import { revealSetsPrimary, type PrimaryShown } from './walletPrimary'

// The wallet's primary name is read again for the reveal, so it never acts on an older read. Off
// never touches the primary name, so it needs no read.
async function revealPrimary({ displayName, primaryChoice, readWalletPrimary }: UseRegistrationActionsProps, shown?: PrimaryShown) {
  if (shown ? !shown.setsPrimary : primaryChoice === false) return { setsPrimary: false }
  return revealSetsPrimary(primaryChoice, await readWalletPrimary(), displayName, shown)
}

/** `shown` is what the person saw as they pressed Register; Register on a saved reservation shows nothing first. */
export async function completeRegistration(props: UseRegistrationActionsProps, confirmedTotalLux?: number, shown?: PrimaryShown) {
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
    const [missing, primary] = await Promise.all([revealCommitmentMissing(props), revealPrimary(props, shown)])
    if (!workspace()) return
    checkSession()
    if (missing) {
      setStrandedCommitment({ controller: selectedAuthority, commitment: preparedCommit.commitment })
      return
    }
    // The switch and its note now show that read; Register signs once pressed with them in view.
    if ('ask' in primary) {
      setWalletError(primary.ask)
      return
    }
    const request = createCompleteRegistrationRequest({
      ...props,
      preparedCommit,
      registerSetsPrimary: primary.setsPrimary,
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
      await applyCompleteRegistrationSuccess({ ...props, registerSetsPrimary: primary.setsPrimary }, {
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
