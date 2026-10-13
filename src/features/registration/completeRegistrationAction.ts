import type { RegistrationQuote } from '@duskdomains/sdk'
import { WalletSessionChangedError } from '../wallet/sessionWriteWallet'
import { premiumDropsSoon } from './premiumTiming'
import {
  createRegistrationCompletionState,
  markRegistrationCompletionFailed,
} from './registrationCompletionState'
import {
  isRegistrationQuoteRefusal,
  registrableQuote,
  registrationPriceChange,
  registrationQuoteBlockedReason,
  registrationTotalLux,
  reviewedRegistrationQuote,
  userFacingErrorMessage,
  userFacingMessageFromText,
  type DuskDomainTxState,
} from '../../names/internal'
import { safeNumber } from '../../names/numbers'
import { formatLifecycleDay } from '../domains/domainFormat'
import { createCompleteRegistrationRequest } from './completeRegistrationCall'
import { handleCompleteRegistrationEarlyReveal } from './completeRegistrationEarlyReveal'
import { completeRegistrationPreflight } from './completeRegistrationPreflight'
import { applyCompleteRegistrationSuccess } from './completeRegistrationSuccess'
import type { UseRegistrationActionsProps } from './registrationActionTypes'
import { updateRegistrationCompletion } from './registrationTxProgress'
import { readReservationQuote, saveReservationQuote, type RegistrationPriceReview } from './reservationQuote'
import { revealCommitmentMissing } from './strandedReservation'
import { revealSetsPrimary, type PrimaryShown } from './walletPrimary'

// The wallet's primary name is read again for the reveal, so it never acts on an older read. Off
// never touches the primary name, so it needs no read.
async function revealPrimary({ displayName, primaryChoice, readWalletPrimary }: UseRegistrationActionsProps, shown?: PrimaryShown) {
  if (shown ? !shown.setsPrimary : primaryChoice === false) return { setsPrimary: false }
  return revealSetsPrimary(primaryChoice, await readWalletPrimary(), displayName, shown)
}

// Show the new price in place of the failed attempt. The reservation is untouched: Register at the
// new price reveals it as it is, with no new commitment, while its window lasts.
function offerNewPrice(props: UseRegistrationActionsProps, commitment: string, review: Omit<RegistrationPriceReview, 'commitment'>) {
  props.setTxState(null)
  props.setRegistrationCompletion(null)
  props.setPriceChange({ commitment, ...review })
  props.refreshQuotes()
}

const isBytes = (value: unknown): value is ArrayBuffer | ArrayBufferView =>
  ArrayBuffer.isView(value) || Object.prototype.toString.call(value) === '[object ArrayBuffer]'

// What a failed transaction says about why it failed: the node receipt's error, which the writer
// puts in its message, the error the wallet's wait for execution rejected with, which the writer
// replaces with its own copy, and the wallet's receipt. Dusk Connect can pass the node's execution
// event payload on as bytes; read any bytes as text, at any depth, so the failure code stays visible.
function failureText(state: DuskDomainTxState) {
  let result = ''
  try {
    result = typeof state.result === 'string' ? state.result
      : JSON.stringify(state.result ?? null, (_, value: unknown) => typeof value === 'bigint' ? String(value)
        : isBytes(value) ? new TextDecoder().decode(value) : value) ?? ''
  } catch { /* A receipt that can't be read carries no failure code. */ }
  const error = state.error instanceof Error ? state.error.message : typeof state.error === 'string' ? state.error : ''
  return `${state.message ?? ''} ${error} ${result}`
}

// Only a transaction the chain executed and refused had its payment returned: a failed state with
// a transaction ID whose own receipt names the refusal. A read before signing fails without a
// transaction, and a timeout proves nothing about execution.
function refusedForPrice(state: DuskDomainTxState) {
  return state.status === 'failed' && Boolean(state.txId) && isRegistrationQuoteRefusal(failureText(state))
}

const refusedCopy = 'The registration price changed before your registration was confirmed, so it was refused. Your payment was returned; only the network fee was charged.'

// The chain refused the reveal because a policy replacement changed its price after signing. Quote
// again under the current policy and offer that price for the same reservation.
async function offerPriceAfterRefusal(props: UseRegistrationActionsProps, commitment: string, signedLux: number, workspace: () => boolean) {
  const read = props.duskDomainsOnChainClient
    ? await props.duskDomainsOnChainClient.getRegistrationQuote(props.displayName, props.duration, props.selectedAuthority)
    : null
  if (!workspace()) return
  if (read?.ok && registrableQuote(read.value.quote)) {
    offerNewPrice(props, commitment, { previousLux: signedLux, quote: read.value.quote, sinceReservation: false, refused: true })
    return
  }
  const reason = read?.ok ? registrationQuoteBlockedReason(read.value.quote)
    : read ? userFacingMessageFromText(read.error.message) : ''
  props.setRegistrationCompletion(current => markRegistrationCompletionFailed(current, `${refusedCopy} ${reason || 'Try again in a moment.'}`))
}

/**
 * `shown` is what the person saw as they pressed Register; Register on a saved reservation shows
 * nothing first. `confirmedQuote` is a new price the person confirmed after a policy change: it
 * becomes the reservation's price and the reveal signs exactly it.
 */
export async function completeRegistration(props: UseRegistrationActionsProps, confirmedTotalLux?: number, shown?: PrimaryShown, confirmedQuote?: RegistrationQuote) {
  const {
    displayName,
    preparedCommit,
    runtimeConfig,
    selectedAuthority,
    setPriceChange,
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
  // Near a premium step only the total the confirmation showed may be signed; a confirmed new price is its own.
  if (!confirmedQuote && premiumDropsSoon(props.result, props.lifecycleBaseBlockHeight)
    && confirmedTotalLux !== registrationTotalLux(props.result, props.duration, props.feeConfig)) return

  const session = submitNameWrite.captureSession(props.selectedAddress)
  const checkSession = () => { if (!session()) throw new WalletSessionChangedError() }
  setWalletError('')
  setRegistrationCompletion(null)
  // A new attempt answers a shown price change; detecting another change shows it again.
  if (props.priceChange) setPriceChange(null)
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
    // A confirmed new price becomes the price this reservation was made at, so another try won't ask again.
    const reservation = { chainId: runtimeConfig.chainId, commitment: preparedCommit.commitment }
    if (confirmedQuote) saveReservationQuote(reservation, reviewedRegistrationQuote(confirmedQuote, props.duration))
    const request = createCompleteRegistrationRequest({
      ...props,
      preparedCommit,
      registerSetsPrimary: primary.setsPrimary,
      quote: confirmedQuote,
      reservedQuote: readReservationQuote(reservation),
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
      return
    }
    // Preparation quoted again and found the price changed: nothing reached the wallet.
    const change = registrationPriceChange(finalState.error)
    if (change) {
      offerNewPrice(props, preparedCommit.commitment, {
        previousLux: safeNumber(change.previousTotalLux), quote: change.quote, sinceReservation: change.sinceReservation, refused: false,
      })
      return
    }
    // The chain refused it for a changed policy or fee. The host returned the payment; gas was charged.
    if (refusedForPrice(finalState)) {
      await offerPriceAfterRefusal(props, preparedCommit.commitment, request.feeLux, workspace)
      return
    }
    await handleCompleteRegistrationEarlyReveal(props, finalState)
  } catch (error) {
    if (!workspace()) return
    const message = userFacingErrorMessage(error)
    setWalletError(message)
    setRegistrationCompletion((current) => markRegistrationCompletionFailed(current, message))
  }
}
