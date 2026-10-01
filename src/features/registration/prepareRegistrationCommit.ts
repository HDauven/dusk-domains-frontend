import { waitForCommitmentBlock } from '../../app/commitmentBlocks'
import {
  coreCommitRuntimeCall,
  createRegistrationSecret,
  currentUnixSeconds,
  listPendingNameReservations,
  REGISTRATION_MIN_REVEAL_WAIT_BLOCKS,
  registrationCommitmentHex,
  registrationRegistry,
  removePendingNameReservation,
  upsertPendingNameReservation,
  userFacingErrorMessage,
} from '../../names/internal'
import type { UseRegistrationActionsProps } from './registrationActionTypes'
import { clearReservationPrimaryChoice, saveReservationPrimaryChoice } from './reservationPrimaryChoice'

export async function prepareRegistrationCommit({
  canPrepareCommit,
  displayName,
  duration,
  indexerClient,
  liveDuskDomainsApp,
  loadPendingReservations,
  nodeHex,
  refreshCommitBlockState,
  registerSetsPrimary,
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
  const workspace = submitNameWrite.captureWorkspace(displayName)
  if (!canPrepareCommit || !selectedAddress) return

  setWalletError('')
  setRegistrationCompletion(null)
  if (!ensureContractAuthorityForLiveWrite('reserve this name', setWalletError)) return
  if (!(await ensurePublicBalanceForLiveWrite('reserving this name', message => { if (workspace()) setWalletError(message) }))) return

  if (!workspace()) return

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
    // A released name comes back in the registry that holds it; the reveal finds it there too.
    const registry = liveDuskDomainsApp
      ? await registrationRegistry(liveDuskDomainsApp, runtimeConfig.contracts, nodeHex)
      : null
    const call = { ...coreCommitRuntimeCall({ commitment }), ...(registry ? { contractId: registry } : {}) }
    const finalState = await submitNameWrite(displayName, call, {
      workspace,
      contracts: runtimeConfig.contracts,
      beforeSign: () => {
        if (listPendingNameReservations({ chainId: runtimeConfig.chainId, controller: selectedAuthority }).some(saved => saved.node === nodeHex)) {
          throw new Error('Open the saved reservation in My names to check its status before trying again.')
        }
        const saved = upsertPendingNameReservation(reservation)
        if (!saved.some(entry => entry.commitment === commitment && entry.secret === secret)) {
          throw new Error('Cannot save the reservation. Enable browser storage and try again.')
        }
        saveReservationPrimaryChoice(reservation, registerSetsPrimary)
        loadPendingReservations()
      },
      onNotBroadcast: () => {
        removePendingNameReservation({ chainId: reservation.chainId, controller: reservation.controller, commitment })
        clearReservationPrimaryChoice(reservation)
        loadPendingReservations()
      },
      onUpdate: setCommitTxState,
    })
    if (finalState.status !== 'executed') return

    const liveBlockHeight = liveDuskDomainsApp ? await getCurrentBlockHeight() : null
    const initialBlockHeight = liveDuskDomainsApp ? liveBlockHeight : 0
    const initialCurrentBlockHeight = liveDuskDomainsApp ? liveBlockHeight : REGISTRATION_MIN_REVEAL_WAIT_BLOCKS
    upsertPendingNameReservation({
      ...reservation,
      updatedAt: new Date().toISOString(),
      committedBlockHeight: initialBlockHeight,
      committedTxId: finalState.txId ?? null,
    })
    loadPendingReservations()
    if (!workspace()) return
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

    if (!liveDuskDomainsApp) return

    if (!indexerClient) {
      setIndexerError('Reservation submitted, but confirmation cannot be tracked yet. Your claim is saved in this browser.')
      return
    }

    setIndexerError('')
    setIndexerConfirmation('Waiting for Dusk Domains to confirm the reservation.')
    const confirmed = await waitForCommitmentBlock({
      commitment,
      refresh: refreshCommitBlockState,
    })
    if (!workspace()) return
    setIndexerConfirmation(confirmed
      ? 'Reservation confirmed.'
      : 'Reservation submitted, but confirmation is still syncing.')
  } catch (error) {
    if (!workspace()) return
    const message = userFacingErrorMessage(error)
    setWalletError(message)
    setRegistrationCompletion(null)
  }
}
