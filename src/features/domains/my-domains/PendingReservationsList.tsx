import { Panel } from '../../../components/ui/Panel'
import { Button } from '../../../components/ui/Button'
import { ArrowRight, X } from 'lucide-react'
import { registrationCommitWindow, type PendingNameReservation } from '../../../names/internal'
import { pluralize } from '../../../utils/format'
import {
  pendingReservationActionCopy,
  pendingReservationNextStepCopy,
  pendingReservationStatusCopy,
} from '../../registration/registrationCopy'

export function PendingReservationsList({
  currentBlockHeight,
  onForgetPendingReservation,
  onOpenPendingReservation,
  pendingReservations,
}: {
  currentBlockHeight: number | null
  onForgetPendingReservation: (reservation: PendingNameReservation) => void
  onOpenPendingReservation: (reservation: PendingNameReservation) => void
  pendingReservations: PendingNameReservation[]
}) {
  return (
    <section className="pending-reservations" aria-labelledby="pending-heading">
      <h2 id="pending-heading" className="eyebrow">
        Unfinished {pluralize(pendingReservations.length, 'claim')}
      </h2>
      {pendingReservations.map((reservation) => {
        const reservationWindow = registrationCommitWindow(reservation.committedBlockHeight, currentBlockHeight)
        return (
          <Panel as="article" className={`pending-reservation ${reservationWindow.status}`} key={reservation.commitment}>
            <div className="pending-reservation-main">
              <strong>{reservation.name}</strong>
              <span>
                {reservation.durationYears} {pluralize(reservation.durationYears, 'year')} ·{' '}
                <em>{pendingReservationStatusCopy(reservationWindow.status, reservationWindow.waitBlocks)}</em>
              </span>
              <p>{pendingReservationNextStepCopy(reservationWindow.status, reservationWindow.waitBlocks)}</p>
            </div>
            <div className="pending-reservation-actions">
              <Button variant={reservationWindow.status === 'ready' ? 'primary' : 'secondary'}
                className="compact"
                type="button"
                onClick={() => void onOpenPendingReservation(reservation)}
              >
                {pendingReservationActionCopy(reservationWindow.status)} <ArrowRight size={16} />
              </Button>
              <Button variant="quiet"
                className="icon-button"
                type="button"
                aria-label={`Forget the saved claim for ${reservation.name}`}
                title="Forget this saved claim"
                onClick={() => onForgetPendingReservation(reservation)}
              >
                <X size={16} />
              </Button>
            </div>
          </Panel>
        )
      })}
    </section>
  )
}
