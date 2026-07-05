import { useCallback, useEffect } from 'react'
import {
  type DuskDomainsIndexerClient,
  type PendingNameReservation,
} from '../../names/internal'
import { refreshPendingReservationsFromIndexer as refreshSavedPendingReservationsFromIndexer } from './pendingReservationSync'

export function useSavedPendingReservationRefresh({
  indexerClient,
  loadPendingReservations,
  pendingReservations,
  refreshListView,
  setCurrentBlockHeight,
  setNowSeconds,
}: {
  indexerClient: DuskDomainsIndexerClient | null
  loadPendingReservations: () => PendingNameReservation[]
  pendingReservations: PendingNameReservation[]
  refreshListView: boolean
  setCurrentBlockHeight: (height: number | null) => void
  setNowSeconds: (seconds: number) => void
}) {
  const refreshPendingReservationsFromIndexer = useCallback(async () => {
    if (!indexerClient || pendingReservations.length === 0) return false

    return refreshSavedPendingReservationsFromIndexer({
      indexerClient,
      loadPendingReservations,
      pendingReservations,
      setCurrentBlockHeight,
      setNowSeconds,
    })
  }, [
    indexerClient,
    loadPendingReservations,
    pendingReservations,
    setCurrentBlockHeight,
    setNowSeconds,
  ])

  useEffect(() => {
    if (!refreshListView || !indexerClient || pendingReservations.length === 0) return

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
    pendingReservations.length,
    refreshListView,
    refreshPendingReservationsFromIndexer,
  ])

  return {
    refreshPendingReservationsFromIndexer,
  }
}
