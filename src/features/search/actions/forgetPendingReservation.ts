import {
  removePendingNameReservation,
  type PendingNameReservation,
} from '../../../names/internal'
import type { UseSearchControllerProps } from '../searchControllerTypes'

export function forgetPendingReservation(
  {
    loadPendingReservations,
  }: UseSearchControllerProps,
  reservation: PendingNameReservation,
) {
  if (!globalThis.confirm(`Forget the saved reservation for ${reservation.name}? This deletes its recovery secret from this browser, but does not cancel a submitted transaction. Check your wallet first.`)) return
  removePendingNameReservation({
    chainId: reservation.chainId,
    controller: reservation.controller,
    commitment: reservation.commitment,
  })
  loadPendingReservations()
}
