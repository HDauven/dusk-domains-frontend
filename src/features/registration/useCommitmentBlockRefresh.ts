import { useAutoRefresh } from '../../app/useAutoRefresh'
import { useSingleFlight } from '../../app/useSingleFlight'
import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react'
import {
  currentUnixSeconds,
  registrationCommitWindow,
  type DuskDomainsIndexerClient,
  type PendingNameReservation,
} from '../../names/internal'
import type { CurrentBlockHeightReader } from '../../app/duskNodeHeight'
import { refreshCommitBlockStateFromIndexer } from './pendingReservationSync'
import type { PreparedRegistrationCommit } from './pendingReservationTypes'

export function useCommitmentBlockRefresh({
  chainId,
  currentCommitment,
  committedBlockHeight,
  currentBlockHeight,
  getCurrentBlockHeight,
  indexerClient,
  loadPendingReservations,
  selectedAuthority,
  setCurrentBlockHeight,
  setNowSeconds,
  setPreparedCommit,
}: {
  chainId: string
  currentCommitment: string
  committedBlockHeight: number | null
  currentBlockHeight: number | null
  getCurrentBlockHeight: CurrentBlockHeightReader
  indexerClient: DuskDomainsIndexerClient | null
  loadPendingReservations: () => PendingNameReservation[]
  selectedAuthority: string
  setCurrentBlockHeight: (height: number | null) => void
  setNowSeconds: (seconds: number) => void
  setPreparedCommit: Dispatch<SetStateAction<PreparedRegistrationCommit | null>>
}) {
  const refreshCommitBlockState = useCallback(async (commitment: string) => {
    if (!indexerClient) {
      setCurrentBlockHeight(await getCurrentBlockHeight())
      return false
    }

    return refreshCommitBlockStateFromIndexer({
      chainId,
      commitment,
      getCurrentBlockHeight,
      indexerClient,
      loadPendingReservations,
      selectedAuthority,
      setCurrentBlockHeight,
      setPreparedCommit,
    })
  }, [
    chainId,
    getCurrentBlockHeight,
    indexerClient,
    loadPendingReservations,
    selectedAuthority,
    setCurrentBlockHeight,
    setPreparedCommit,
  ])

  const read = useCallback(async () => {
    setNowSeconds(currentUnixSeconds())
    return refreshCommitBlockState(currentCommitment)
  }, [currentCommitment, refreshCommitBlockState, setNowSeconds])
  const refresh = useSingleFlight(read, read)
  const status = registrationCommitWindow(committedBlockHeight, currentBlockHeight).status
  const waiting = Boolean(currentCommitment) && status !== 'ready' && status !== 'stale'
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active && waiting && document.visibilityState !== 'hidden') void refresh().catch(() => {})
    })
    return () => { active = false }
  }, [waiting, refresh])
  useAutoRefresh(refresh, waiting, 2_500)

  return {
    refreshCommitBlockState,
  }
}
