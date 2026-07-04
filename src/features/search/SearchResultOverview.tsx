import type { NameResult, NameStatus, PendingNameReservation } from '../../names/internal'
import {
  savedReservationOverviewCopy,
} from '../registration/registrationCopy'
import { overviewCopyForIssues } from '../domains/domainFormat'
import { SavedReservationCallout } from './SavedReservationCallout'
import { SearchResultOverviewActions } from './SearchResultOverviewActions'
import { SearchResultOverviewGrid } from './SearchResultOverviewGrid'
import type { ReservationWindow } from './overviewTypes'

export function SearchResultOverview({
  canRegister,
  displayName,
  onContinueRegistration,
  onOpenPendingReservation,
  onOpenPendingReservations,
  onViewDetails,
  primaryVerified,
  resultStatus,
  resultIssues,
  savedReservation,
  savedReservationWindow,
  subnameCount,
}: {
  canRegister: boolean
  displayName: string
  onContinueRegistration: () => void
  onOpenPendingReservation: (reservation: PendingNameReservation) => void
  onOpenPendingReservations: () => void
  onViewDetails: () => void
  primaryVerified: boolean
  resultStatus: NameStatus
  resultIssues: NameResult['issues']
  savedReservation: PendingNameReservation | null
  savedReservationWindow: ReservationWindow | null
  subnameCount: number
}) {
  return (
    <section className="overview-panel" aria-labelledby="overview-heading">
      <div className="overview-copy">
        <h2 id="overview-heading">
          {savedReservation ? 'Resume registration' : canRegister ? 'Ready to claim' : resultStatus === 'registered' ? 'Active domain' : 'Registration blocked'}
        </h2>
        <p>{savedReservation ? savedReservationOverviewCopy(savedReservationWindow?.status, savedReservationWindow?.waitBlocks ?? 0) : overviewCopyForIssues(resultStatus, resultIssues)}</p>
      </div>

      {savedReservation && savedReservationWindow ? (
        <SavedReservationCallout
          onOpenPendingReservations={onOpenPendingReservations}
          window={savedReservationWindow}
        />
      ) : null}

      <SearchResultOverviewGrid
        displayName={displayName}
        primaryVerified={primaryVerified}
        reservedByUser={Boolean(savedReservation)}
        resultStatus={resultStatus}
        subnameCount={subnameCount}
      />

      <SearchResultOverviewActions
        canRegister={canRegister}
        onContinueRegistration={onContinueRegistration}
        onOpenPendingReservation={onOpenPendingReservation}
        onViewDetails={onViewDetails}
        savedReservation={savedReservation}
        savedReservationWindow={savedReservationWindow}
      />
    </section>
  )
}
