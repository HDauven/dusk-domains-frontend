import { useAutoRefresh } from '../../app/useAutoRefresh'
import { useSingleFlight } from '../../app/useSingleFlight'
import { useCallback, useEffect } from 'react'
import {
  registrationCommitWindow,
  type DuskDomainsIndexerClient,
  type PendingNameReservation,
} from '../../names/internal'
import type { CurrentBlockHeightReader } from '../../app/duskNodeHeight'
import { refreshPendingReservationsFromIndexer as refreshSavedPendingReservationsFromIndexer } from './pendingReservationSync'

export function useSavedPendingReservationRefresh({
  currentBlockHeight,
  indexerClient,
  getCurrentBlockHeight,
  loadPendingReservations,
  pendingReservations,
  refreshListView,
  setCurrentBlockHeight,
  setNowSeconds,
}: {
  currentBlockHeight: number | null
  indexerClient: DuskDomainsIndexerClient | null
  getCurrentBlockHeight: CurrentBlockHeightReader
  loadPendingReservations: () => PendingNameReservation[]
  pendingReservations: PendingNameReservation[]
  refreshListView: boolean
  setCurrentBlockHeight: (height: number | null) => void
  setNowSeconds: (seconds: number) => void
}) {
  const refreshPendingReservationsFromIndexer = useCallback(async () => {
    if (pendingReservations.length === 0) return false
    if (!indexerClient) {
      setCurrentBlockHeight(await getCurrentBlockHeight())
      return false
    }

    return refreshSavedPendingReservationsFromIndexer({
      getCurrentBlockHeight,
      indexerClient,
      loadPendingReservations,
      pendingReservations,
      setCurrentBlockHeight,
      setNowSeconds,
    })
  }, [
    getCurrentBlockHeight,
    indexerClient,
    loadPendingReservations,
    pendingReservations,
    setCurrentBlockHeight,
    setNowSeconds,
  ])

  const refresh = useSingleFlight(refreshPendingReservationsFromIndexer, refreshPendingReservationsFromIndexer)
  const enabled = refreshListView && pendingReservations.length > 0
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active && enabled && document.visibilityState !== 'hidden') void refresh().catch(() => {})
    })
    return () => { active = false }
  }, [enabled, refresh])
  const waiting = pendingReservations.some(reservation => {
    const status = registrationCommitWindow(reservation.committedBlockHeight, currentBlockHeight).status
    return status !== 'ready' && status !== 'stale'
  })
  useAutoRefresh(refresh, enabled, waiting ? 10_000 : Math.max(180_000, pendingReservations.length * 60_000))

  return {
    refreshPendingReservationsFromIndexer,
  }
}
