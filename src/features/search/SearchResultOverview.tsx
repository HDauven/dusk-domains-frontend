import { ArrowRight, Clock } from 'lucide-react'
import type { NameResult, NameStatus, PendingNameReservation } from '../../names/internal'
import {
  pendingReservationActionCopy,
  pendingReservationNextStepCopy,
  pendingReservationStatusCopy,
} from '../registration/registrationCopy'
import { maxDurationYears, minDurationYears } from '../../app/appConstants'
import { TermPicker } from '../../components/ui/TermPicker'
import { formatDusk, pluralize } from '../../utils/format'
import { overviewCopyForIssues } from '../domains/domainFormat'
import type { ReservationWindow } from './overviewTypes'


// The result for a name nobody holds: a claim card with the term, the price and one action.
// A saved reservation or a name that cannot be claimed replaces it with the right next step.
export function SearchResultOverview({
  canRegister,
  displayName,
  duration,
  expiryDate,
  feeConfigLoading,
  onContinueRegistration,
  onDurationChange,
  onOpenPendingReservation,
  onOpenPendingReservations,
  onViewDetails,
  registrationFee,
  resultIssues,
  resultStatus,
  savedReservation,
  savedReservationWindow,
}: {
  canRegister: boolean
  displayName: string
  duration: number
  expiryDate: string
  feeConfigLoading: boolean
  onContinueRegistration: () => void
  onDurationChange: (duration: number) => void
  onOpenPendingReservation: (reservation: PendingNameReservation) => void
  onOpenPendingReservations: () => void
  onViewDetails: () => void
  registrationFee: number
  resultIssues: NameResult['issues']
  resultStatus: NameStatus
  savedReservation: PendingNameReservation | null
  savedReservationWindow: ReservationWindow | null
}) {
  if (savedReservation) {
    const status = savedReservationWindow?.status ?? 'missing'
    const waitBlocks = savedReservationWindow?.waitBlocks ?? 0
    return (
      <section className="claim-card resume" aria-labelledby="overview-heading">
        <div className="claim-main">
          <span className="eyebrow"><Clock size={13} /> Registration saved</span>
          <h2 id="overview-heading">{pendingReservationStatusCopy(status, waitBlocks)}</h2>
          <p>{pendingReservationNextStepCopy(status, waitBlocks)}</p>
        </div>
        <div className="claim-stub">
          <button className="primary-button" type="button" onClick={() => void onOpenPendingReservation(savedReservation)}>
            {pendingReservationActionCopy(status)} <ArrowRight size={18} />
          </button>
          <button className="commit-button" type="button" onClick={() => void onOpenPendingReservations()}>
            All saved registrations
          </button>
        </div>
      </section>
    )
  }

  if (!canRegister) {
    return (
      <section className="claim-card blocked" aria-labelledby="overview-heading">
        <div className="claim-main">
          <h2 id="overview-heading">{resultStatus === 'registered' ? 'This name is taken' : 'This name can’t be claimed'}</h2>
          <p>{overviewCopyForIssues(resultStatus, resultIssues)}</p>
        </div>
        {resultStatus === 'registered' ? (
          <div className="claim-stub">
            <button className="commit-button" type="button" onClick={onViewDetails}>View profile</button>
          </div>
        ) : null}
      </section>
    )
  }

  const perYear = duration > 0 ? registrationFee / duration : 0
  const label = displayName.replace(/\.dusk$/, '')

  return (
    <section className="claim-card" aria-labelledby="overview-heading">
      <div className="claim-main">
        <span className="eyebrow">
          {label.length} {pluralize(label.length, 'character')} · {feeConfigLoading ? 'loading price' : `${formatDusk(perYear)} DUSK per year`}
        </span>
        <h2 id="overview-heading">Claim it for</h2>
        <TermPicker label="Registration term" max={maxDurationYears} min={minDurationYears} value={duration} onChange={onDurationChange} />
        <p>It points to your wallet from day one, and you can make it your primary name while you claim it.</p>
      </div>
      <div className="claim-stub">
        <div className="claim-price">
          <strong>{feeConfigLoading ? '…' : formatDusk(registrationFee)} <small>DUSK</small></strong>
          <span>for {duration} {pluralize(duration, 'year')} · until {expiryDate}</span>
        </div>
        <button className="primary-button" type="button" disabled={feeConfigLoading} onClick={onContinueRegistration}>
          Claim {displayName}
        </button>
      </div>
    </section>
  )
}
