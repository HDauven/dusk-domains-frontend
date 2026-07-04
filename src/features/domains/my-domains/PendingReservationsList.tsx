import { ArrowRight, X } from 'lucide-react'
import { registrationCommitWindow } from '../../../names/internal'
import type { PendingReservationsListProps } from './types'

export function PendingReservationsList({
  currentBlockHeight,
  formatPendingReservationDetail,
  onForgetPendingReservation,
  onOpenPendingReservation,
  pendingReservationActionCopy,
  pendingReservationNextStepCopy,
  pendingReservationStatusCopy,
  pendingReservations,
}: PendingReservationsListProps) {
  return (
    <div className="pending-reservations" aria-label="Pending reservations">
      {pendingReservations.map((reservation) => {
        const reservationWindow = registrationCommitWindow(reservation.committedBlockHeight, currentBlockHeight)
        return (
          <article className="pending-reservation-row" key={reservation.commitment}>
            <div className="reservation-main">
              <strong>{reservation.name}</strong>
              <span>{formatPendingReservationDetail(reservation)}</span>
            </div>
            <div className="reservation-summary">
              <strong className={`reservation-status ${reservationWindow.status}`}>
                {pendingReservationStatusCopy(reservationWindow.status, reservationWindow.waitBlocks)}
              </strong>
              <span>{pendingReservationNextStepCopy(reservationWindow.status, reservationWindow.waitBlocks)}</span>
            </div>
            <div className="reservation-actions">
              <button className="primary-button compact" type="button" onClick={() => void onOpenPendingReservation(reservation)}>
                {pendingReservationActionCopy(reservationWindow.status)}
                <ArrowRight size={18} />
              </button>
              <button
                className="icon-button soft"
                type="button"
                aria-label={`Remove saved reservation for ${reservation.name}`}
                onClick={() => onForgetPendingReservation(reservation)}
              >
                <X size={18} />
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
