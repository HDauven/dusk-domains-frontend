import { useCallback, useEffect, useState } from 'react'
import {
  listPendingNameReservations,
  type PendingNameReservation,
} from '../../names/internal'

export function usePendingReservationList({
  chainId,
  selectedAuthority,
}: {
  chainId: string
  selectedAuthority: string
}) {
  const [pendingReservations, setPendingReservations] = useState<PendingNameReservation[]>([])

  const loadPendingReservations = useCallback(() => {
    if (!selectedAuthority) {
      setPendingReservations([])
      return []
    }

    const nextReservations = listPendingNameReservations({
      chainId,
      controller: selectedAuthority,
    })
    setPendingReservations(nextReservations)
    return nextReservations
  }, [chainId, selectedAuthority])

  useEffect(() => {
    let cancelled = false
    globalThis.queueMicrotask(() => {
      if (!cancelled) loadPendingReservations()
    })
    return () => {
      cancelled = true
    }
  }, [loadPendingReservations])

  return {
    loadPendingReservations,
    pendingReservations,
  }
}
