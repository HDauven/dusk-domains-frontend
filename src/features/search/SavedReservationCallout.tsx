import { Clock } from 'lucide-react'
import {
  pendingReservationNextStepCopy,
  pendingReservationStatusCopy,
} from '../registration/registrationCopy'
import type { ReservationWindow } from './overviewTypes'

export function SavedReservationCallout({
  onOpenPendingReservations,
  window,
}: {
  onOpenPendingReservations: () => void
  window: ReservationWindow
}) {
  return (
    <div className="saved-reservation-callout">
      <Clock size={18} />
      <div>
        <strong>{pendingReservationStatusCopy(window.status, window.waitBlocks)}</strong>
        <span>{pendingReservationNextStepCopy(window.status, window.waitBlocks)}</span>
      </div>
      <button className="commit-button save-record" type="button" onClick={() => void onOpenPendingReservations()}>
        My Domains
      </button>
    </div>
  )
}
