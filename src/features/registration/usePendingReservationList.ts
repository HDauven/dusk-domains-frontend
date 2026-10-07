import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  listPendingNameReservations,
  type PendingNameReservation,
} from '../../names/internal'

export function usePendingReservationList({
  chainId,
  directory,
  explicitlyDisconnected = false,
  selectedAuthority,
}: {
  directory?: string
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

  const scope = useRef({ chainId, directory, owner })
  const loadPendingReservations = useCallback(() => {
    const { chainId, directory } = scope.current
    let { owner } = scope.current
    // Provider events clear storage before React commits the new session.
    try {
      const remembered = globalThis.sessionStorage?.getItem(`dusk-domains:last-claim-owner:${chainId}`)
      if (remembered !== undefined && remembered !== owner) owner = ''
    } catch { /* Keep connected claims available without storage. */ }
    const nextReservations = owner ? listPendingNameReservations({
      chainId,
      directory,
      controller: owner,
    }) : []
    setPendingReservations(nextReservations)
    return nextReservations
  }, [])

  useLayoutEffect(() => {
    scope.current = { chainId, directory, owner }
    let cancelled = false
    globalThis.queueMicrotask(() => {
      if (!cancelled) loadPendingReservations()
    })
    return () => {
      cancelled = true
    }
  }, [chainId, directory, owner, loadPendingReservations])

  const scopedReservations = useMemo(() => pendingReservations.filter(reservation => reservation.chainId === chainId
    && (!directory || reservation.directory.replace(/^0x/, '') === directory.replace(/^0x/, ''))
    && reservation.controller.toLowerCase() === owner.toLowerCase()), [chainId, directory, owner, pendingReservations])

  return {
    loadPendingReservations,
    pendingReservations: scopedReservations,
  }
}
