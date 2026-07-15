import {
  removePendingNameReservation,
  type PendingNameReservation,
} from '../../names/internal'

export function clearRegisteredPendingReservations({
  canonicalName,
  chainId,
  loadPendingReservations,
}: {
  canonicalName: string
  chainId: string
  loadPendingReservations: () => PendingNameReservation[]
}) {
  const normalizedName = canonicalName.trim().toLowerCase()
  let removed = false

  for (const reservation of loadPendingReservations()) {
    if (reservation.chainId !== chainId) continue
    if (reservation.name.trim().toLowerCase() !== normalizedName) continue

    removePendingNameReservation({
      chainId: reservation.chainId,
      controller: reservation.controller,
      commitment: reservation.commitment,
    })
    removed = true
  }

  if (removed) loadPendingReservations()
  return removed
}
