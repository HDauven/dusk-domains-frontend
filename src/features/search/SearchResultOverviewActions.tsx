import { ArrowRight } from 'lucide-react'
import type { PendingNameReservation } from '../../names/internal'
import { pendingReservationActionCopy } from '../registration/registrationCopy'
import type { ReservationWindow } from './overviewTypes'

export function SearchResultOverviewActions({
  canRegister,
  onContinueRegistration,
  onOpenPendingReservation,
  onViewDetails,
  savedReservation,
  savedReservationWindow,
}: {
  canRegister: boolean
  onContinueRegistration: () => void
  onOpenPendingReservation: (reservation: PendingNameReservation) => void
  onViewDetails: () => void
  savedReservation: PendingNameReservation | null
  savedReservationWindow: ReservationWindow | null
}) {
  return (
    <div className="overview-actions">
      {savedReservation ? (
        <button className="primary-button compact" type="button" onClick={() => void onOpenPendingReservation(savedReservation)}>
          {pendingReservationActionCopy(savedReservationWindow?.status ?? 'missing')}
          <ArrowRight size={19} />
        </button>
      ) : canRegister ? (
        <button
          className="primary-button compact"
          type="button"
          onClick={onContinueRegistration}
        >
          Continue registration
          <ArrowRight size={19} />
        </button>
      ) : (
        <button className="commit-button save-record" type="button" onClick={onViewDetails}>
          View details
        </button>
      )}
    </div>
  )
}
