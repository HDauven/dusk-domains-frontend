import type {
  PendingNameReservation,
} from '../../names/internal'

export function findSavedReservation({
  displayName,
  nodeHex,
  pendingReservations,
}: {
  displayName: string
  nodeHex: string
  pendingReservations: PendingNameReservation[]
}) {
  return pendingReservations.find((reservation) => (
    reservation.name.toLowerCase() === displayName.toLowerCase()
    || (nodeHex && reservation.node === nodeHex)
  )) ?? null
}
