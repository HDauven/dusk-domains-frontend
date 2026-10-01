import { clearReservationPrimaryChoice } from '../../registration/reservationPrimaryChoice'
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
  const saved = () => loadPendingReservations().some(candidate => candidate.chainId === reservation.chainId
    && candidate.controller.toLowerCase() === reservation.controller.toLowerCase()
    && candidate.commitment === reservation.commitment)
  if (!saved()) return
  if (!globalThis.confirm(`Forget the saved reservation for ${reservation.name}? This deletes its recovery secret from this browser, but does not cancel a submitted transaction. Check your wallet first.`)) return
  if (!saved()) return
  removePendingNameReservation({
    chainId: reservation.chainId,
    controller: reservation.controller,
    commitment: reservation.commitment,
  })
  clearReservationPrimaryChoice(reservation)
  loadPendingReservations()
}
