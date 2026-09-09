import { waitForCommitmentBlock } from '../../app/appHelpers'
import {
  coreCommitRuntimeCall,
  createRegistrationSecret,
  currentUnixSeconds,
  listPendingNameReservations,
  REGISTRATION_MIN_REVEAL_WAIT_BLOCKS,
  registrationCommitmentHex,
  upsertPendingNameReservation,
  userFacingErrorMessage,
} from '../../names/internal'
import type { UseRegistrationActionsProps } from './registrationActionTypes'

export async function prepareRegistrationCommit({
  canPrepareCommit,
  displayName,
  duration,
  indexerClient,
  liveDuskDomainsApp,
  loadPendingReservations,
  nodeHex,
  refreshCommitBlockState,
  runtimeConfig,
  selectedAddress,
  selectedAuthority,
  setCommitTxState,
  setCommitted,
  setCurrentBlockHeight,
  setIndexerConfirmation,
  setIndexerError,
  setNowSeconds,
  setPreparedCommit,
  setRegistrationCompletion,
  setRegistrationStep,
  setTxState,
  setWalletError,
  submitNameWrite,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
  getCurrentBlockHeight,
}: UseRegistrationActionsProps) {
  if (!canPrepareCommit || !selectedAddress) return

  setWalletError('')
  setRegistrationCompletion(null)
  if (!ensureContractAuthorityForLiveWrite('reserve this name', setWalletError)) return
  if (!(await ensurePublicBalanceForLiveWrite('reserving this name', setWalletError))) return

  try {
    const secret = createRegistrationSecret()
    const commitment = registrationCommitmentHex({
      node: nodeHex,
      controller: selectedAuthority,
      label: displayName.replace(/\.dusk$/u, ''),
      secret,
    })
    const reservationTimestamp = new Date().toISOString()
    const reservation = {
      name: displayName, node: nodeHex, commitment, secret,
      controller: selectedAuthority, ownerAddress: selectedAddress,
      chainId: runtimeConfig.chainId, durationYears: duration,
      committedBlockHeight: null, committedTxId: null,
      createdAt: reservationTimestamp, updatedAt: reservationTimestamp,
    }
    const call = coreCommitRuntimeCall({ commitment })
    const finalState = await submitNameWrite(displayName, call, {
      contracts: runtimeConfig.contracts,
      onUpdate: (state) => {
        if (state.status === 'awaiting_approval') {
          if (listPendingNameReservations({ chainId: runtimeConfig.chainId, controller: selectedAuthority }).some((saved) => saved.node === nodeHex)) {
            throw new Error('Open the saved reservation in My Domains to check its status before trying again.')
          }
          // Persist before the wallet can broadcast; keep uncertain outcomes recoverable.
          const saved = upsertPendingNameReservation(reservation)
          if (!saved.some((entry) => entry.commitment === commitment && entry.secret === secret)) {
            throw new Error('Cannot save the reservation. Enable browser storage and try again.')
          }
          loadPendingReservations()
        }
        setCommitTxState(state)
      },
    })

    if (finalState.status !== 'executed') return

    const liveBlockHeight = liveDuskDomainsApp ? await getCurrentBlockHeight() : null
    const initialBlockHeight = liveDuskDomainsApp ? liveBlockHeight : 0
    const initialCurrentBlockHeight = liveDuskDomainsApp ? liveBlockHeight : REGISTRATION_MIN_REVEAL_WAIT_BLOCKS
    setPreparedCommit({
      commitment,
      secret,
      committedBlockHeight: initialBlockHeight,
      committedTxId: finalState.txId ?? null,
    })
    setCurrentBlockHeight(initialCurrentBlockHeight)
    setNowSeconds(currentUnixSeconds())
    setCommitted(true)
    setRegistrationStep('purchase')
    setTxState(null)
    upsertPendingNameReservation({
      ...reservation,
      committedBlockHeight: initialBlockHeight,
      committedTxId: finalState.txId ?? null,
    })
    loadPendingReservations()

    if (!liveDuskDomainsApp) return

    if (!indexerClient) {
      setIndexerError('Reservation submitted, but confirmation cannot be tracked yet. Refresh again shortly.')
      return
    }

    setIndexerError('')
    setIndexerConfirmation('Waiting for Dusk Domains to confirm the reservation.')
    const confirmed = await waitForCommitmentBlock({
      commitment,
      refresh: refreshCommitBlockState,
    })
    setIndexerConfirmation(confirmed
      ? 'Reservation confirmed.'
      : 'Reservation submitted, but confirmation is still syncing.')
  } catch (error) {
    const message = userFacingErrorMessage(error)
    setWalletError(message)
    setRegistrationCompletion(null)
  }
}
