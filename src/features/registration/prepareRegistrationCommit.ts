import { waitForCommitmentBlock } from '../../app/appHelpers'
import {
  coreCommitRuntimeCall,
  createRegistrationSecret,
  currentUnixSeconds,
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
  liveDuskNamesApp,
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
    const call = coreCommitRuntimeCall({
      commitment,
    })
    const finalState = await submitNameWrite(displayName, call, {
      contracts: runtimeConfig.contracts,
      onUpdate: setCommitTxState,
    })

    if (finalState.status !== 'executed') return

    const initialBlockHeight = liveDuskNamesApp ? null : 0
    const initialCurrentBlockHeight = liveDuskNamesApp ? null : REGISTRATION_MIN_REVEAL_WAIT_BLOCKS
    const reservationTimestamp = new Date().toISOString()
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
      name: displayName,
      node: nodeHex,
      commitment,
      secret,
      controller: selectedAuthority,
      ownerAddress: selectedAddress,
      chainId: runtimeConfig.chainId,
      durationYears: duration,
      committedBlockHeight: initialBlockHeight,
      committedTxId: finalState.txId ?? null,
      createdAt: reservationTimestamp,
      updatedAt: reservationTimestamp,
    })
    loadPendingReservations()

    if (!liveDuskNamesApp) return

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
