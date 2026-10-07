import { useCommitmentBlockRefresh } from './useCommitmentBlockRefresh'
import { usePendingReservationList } from './usePendingReservationList'
import { useSavedPendingReservationRefresh } from './useSavedPendingReservationRefresh'
import type { UsePendingReservationsArgs } from './pendingReservationTypes'

export type { PreparedRegistrationCommit } from './pendingReservationTypes'

export function usePendingReservations({
  explicitlyDisconnected,
  chainId,
  directory,
  currentCommitment,
  getCurrentBlockHeight,
  indexerClient,
  refreshListView,
  selectedAuthority,
  setCurrentBlockHeight,
  setNowSeconds,
  setPreparedCommit,
}: UsePendingReservationsArgs) {
  const {
    loadPendingReservations,
    pendingReservations,
  } = usePendingReservationList({
    directory,
    explicitlyDisconnected,
    chainId,
    selectedAuthority,
  })
  const {
    refreshCommitBlockState,
  } = useCommitmentBlockRefresh({
    chainId,
    currentCommitment,
    getCurrentBlockHeight,
    indexerClient,
    loadPendingReservations,
    selectedAuthority,
    setCurrentBlockHeight,
    setNowSeconds,
    setPreparedCommit,
  })
  const {
    refreshPendingReservationsFromIndexer,
  } = useSavedPendingReservationRefresh({
    indexerClient,
    getCurrentBlockHeight,
    loadPendingReservations,
    pendingReservations,
    refreshListView,
    setCurrentBlockHeight,
    setNowSeconds,
  })

  return {
    loadPendingReservations,
    pendingReservations,
    refreshCommitBlockState,
    refreshPendingReservationsFromIndexer,
  }
}
