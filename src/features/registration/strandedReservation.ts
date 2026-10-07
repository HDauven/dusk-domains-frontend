import { clearReservationPrimaryChoice } from './reservationPrimaryChoice'
import { listPendingNameReservations, removePendingNameReservation } from '../../names/internal'
import { prepareRegistrationCommit } from './prepareRegistrationCommit'
import type { UseRegistrationActionsProps } from './registrationActionTypes'

// Saved reservations are kept per controller. One saved by another account is not this account's
// to judge or replace: its commitment is under that account on chain, and so is its secret here.
function ownSavedReservation({ preparedCommit, runtimeConfig, selectedAuthority }: UseRegistrationActionsProps) {
  if (!preparedCommit || !selectedAuthority) return null
  return listPendingNameReservations({ chainId: runtimeConfig.chainId, directory: runtimeConfig.contracts.directory.contractId, controller: selectedAuthority })
    .find((reservation) => reservation.commitment === preparedCommit.commitment) ?? null
}

// Recovery queries the persisted original commitment store, including after forwarding.
export async function revealCommitmentMissing(props: UseRegistrationActionsProps) {
  const { displayName, duskDomainsOnChainClient, selectedAuthority } = props
  const reservation = ownSavedReservation(props)
  if (!duskDomainsOnChainClient || !reservation) return false
  const read = await duskDomainsOnChainClient.getPendingCommitment(selectedAuthority, reservation.commitment, displayName)
  return read.ok && read.value.pending === null
}

// Forget the saved reservation the reveal cannot use, and reserve again where the reveal goes now.
export async function restartStrandedReservation(props: UseRegistrationActionsProps) {
  const {
    canRestartReservation,
    loadPendingReservations,
    runtimeConfig,
    selectedAuthority,
    setCommitted,
    setPreparedCommit,
    setRegistrationStep,
    setStrandedCommitment,
  } = props
  const reservation = ownSavedReservation(props)
  if (!canRestartReservation || !reservation) return

  removePendingNameReservation({
    chainId: runtimeConfig.chainId,
    controller: selectedAuthority,
    commitment: reservation.commitment,
  })
  clearReservationPrimaryChoice(reservation)
  loadPendingReservations()
  setStrandedCommitment(null)
  setPreparedCommit(null)
  setCommitted(false)
  setRegistrationStep('review')
  // canRestartReservation checks what canPrepareCommit does, less the commit it replaces.
  await prepareRegistrationCommit({ ...props, canPrepareCommit: true })
}
