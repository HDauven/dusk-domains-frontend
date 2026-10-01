import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  listPendingNameReservations,
  type PendingNameReservation,
} from '../../names/internal'

export function usePendingReservationList({
  chainId,
  explicitlyDisconnected = false,
  selectedAuthority,
}: {
  chainId: string
  explicitlyDisconnected?: boolean
  selectedAuthority: string
}) {
  const storageKey = `dusk-domains:last-claim-owner:${chainId}`
  let owner = explicitlyDisconnected ? '' : selectedAuthority
  if (!owner && !explicitlyDisconnected) {
    try { owner = globalThis.sessionStorage?.getItem(storageKey) ?? '' } catch { /* Storage may be unavailable. */ }
  }
  const [pendingReservations, setPendingReservations] = useState<PendingNameReservation[]>([])

  const scope = useRef({ chainId, owner })
  const loadPendingReservations = useCallback(() => {
    const { chainId } = scope.current
    let { owner } = scope.current
    // Provider events clear storage before React commits the new session.
    try {
      const remembered = globalThis.sessionStorage?.getItem(`dusk-domains:last-claim-owner:${chainId}`)
      if (remembered !== undefined && remembered !== owner) owner = ''
    } catch { /* Keep connected claims available without storage. */ }
    const nextReservations = owner ? listPendingNameReservations({
      chainId,
      controller: owner,
    }) : []
    setPendingReservations(nextReservations)
    return nextReservations
  }, [])

  useLayoutEffect(() => {
    scope.current = { chainId, owner }
    let cancelled = false
    globalThis.queueMicrotask(() => {
      if (!cancelled) loadPendingReservations()
    })
    return () => {
      cancelled = true
    }
  }, [chainId, owner, loadPendingReservations])

  const scopedReservations = useMemo(() => pendingReservations.filter(reservation => reservation.chainId === chainId
    && reservation.controller.toLowerCase() === owner.toLowerCase()), [chainId, owner, pendingReservations])

  return {
    loadPendingReservations,
    pendingReservations: scopedReservations,
  }
}
