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
  removePendingNameReservation({
    chainId: reservation.chainId,
    controller: reservation.controller,
    commitment: reservation.commitment,
  })
  loadPendingReservations()
}
