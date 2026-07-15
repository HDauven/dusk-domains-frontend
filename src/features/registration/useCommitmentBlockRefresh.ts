import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react'
import {
  currentUnixSeconds,
  type DuskDomainsIndexerClient,
  type PendingNameReservation,
} from '../../names/internal'
import type { CurrentBlockHeightReader } from '../../app/duskNodeHeight'
import { refreshCommitBlockStateFromIndexer } from './pendingReservationSync'
import type { PreparedRegistrationCommit } from './pendingReservationTypes'

export function useCommitmentBlockRefresh({
  chainId,
  currentCommitment,
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

  useEffect(() => {
    let cancelled = false
    globalThis.queueMicrotask(() => {
      if (!cancelled) setNowSeconds(currentUnixSeconds())
    })
    if (!currentCommitment || (!indexerClient && !getCurrentBlockHeight)) {
      return () => {
        cancelled = true
      }
    }

    const refresh = async () => {
      if (cancelled) return
      setNowSeconds(currentUnixSeconds())
      try {
        await refreshCommitBlockState(currentCommitment)
      } catch {
        // The reveal transaction remains the final readiness check.
      }
    }

    void refresh()
    const intervalId = globalThis.setInterval(() => {
      void refresh()
    }, 2_000)

    return () => {
      cancelled = true
      globalThis.clearInterval(intervalId)
    }
  }, [currentCommitment, getCurrentBlockHeight, indexerClient, refreshCommitBlockState, setNowSeconds])

  return {
    refreshCommitBlockState,
  }
}
