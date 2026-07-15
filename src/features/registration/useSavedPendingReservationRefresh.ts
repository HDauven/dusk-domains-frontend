import { useCallback, useEffect } from 'react'
import {
  type DuskDomainsIndexerClient,
  type PendingNameReservation,
} from '../../names/internal'
import type { CurrentBlockHeightReader } from '../../app/duskNodeHeight'
import { refreshPendingReservationsFromIndexer as refreshSavedPendingReservationsFromIndexer } from './pendingReservationSync'

export function useSavedPendingReservationRefresh({
  indexerClient,
  getCurrentBlockHeight,
  loadPendingReservations,
  pendingReservations,
  refreshListView,
  setCurrentBlockHeight,
  setNowSeconds,
}: {
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

  useEffect(() => {
    if (!refreshListView || (!indexerClient && !getCurrentBlockHeight) || pendingReservations.length === 0) return

    let cancelled = false
    const refresh = async () => {
      if (cancelled) return
      try {
        await refreshPendingReservationsFromIndexer()
      } catch {
        // My Domains keeps the saved reservation visible; the next refresh can update readiness.
      }
    }

    void refresh()
    const intervalId = globalThis.setInterval(() => {
      void refresh()
    }, 4_000)

    return () => {
      cancelled = true
      globalThis.clearInterval(intervalId)
    }
  }, [
    indexerClient,
    getCurrentBlockHeight,
    pendingReservations.length,
    refreshListView,
    refreshPendingReservationsFromIndexer,
  ])

  return {
    refreshPendingReservationsFromIndexer,
  }
}
