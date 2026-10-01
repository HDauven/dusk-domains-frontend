import { Badge } from '../../components/ui/Badge'
import { suggestedNames } from './debouncedSearch'
import { NameCard } from '../../components/ui/NameCard'
import { Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
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
  onSuggestion,
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
  onSuggestion?: (name: string) => void
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
      <Panel className="claim-card resume" aria-labelledby="overview-heading">
        <div className="claim-main">
          <span className="eyebrow"><Clock size={13} /> {status === 'missing' ? 'Request saved' : 'Reserved'}</span>
          <h2 id="overview-heading">{pendingReservationStatusCopy(status, waitBlocks)}</h2>
          <p>{pendingReservationNextStepCopy(status)}</p>
        </div>
        <div className="claim-stub">
          <Button variant="primary" type="button" onClick={() => void onOpenPendingReservation(savedReservation)}>
            {pendingReservationActionCopy(status)} <ArrowRight size={18} />
          </Button>
          <Button type="button" onClick={() => void onOpenPendingReservations()}>
            All saved reservations
          </Button>
        </div>
      </Panel>
    )
  }

  if (!canRegister) {
    return (
      <Panel className="claim-card blocked" aria-labelledby="overview-heading">
        <div className="claim-main">
          <h2 id="overview-heading">{resultStatus === 'registered' ? 'This name is taken' : 'This name can’t be claimed'}</h2>
          <p>{overviewCopyForIssues(resultStatus, resultIssues)}</p>
          {resultStatus === 'registered' && onSuggestion ? <div className="name-suggestions"><p>Try another name</p>{suggestedNames(displayName).map(name => <Button key={name} onClick={() => onSuggestion(name)}>{name}</Button>)}</div> : null}
        </div>
        {resultStatus === 'registered' ? (
          <div className="claim-stub">
            <Button type="button" onClick={onViewDetails}>View profile</Button>
          </div>
        ) : null}
      </Panel>
    )
  }


  return (
    <Panel className="claim-card" aria-labelledby="overview-heading">
      <div className="claim-main">
        <NameCard name={displayName}><Badge status="available">Available</Badge></NameCard>
        <h2 id="overview-heading">Registration term</h2>
        <TermPicker label="Registration term" max={maxDurationYears} min={minDurationYears} value={duration} onChange={onDurationChange} />
        <p>Your wallet will own the name. Network fees are shown before signing.</p>
      </div>
      <div className="claim-stub">
        <div className="claim-price">
          <strong>{feeConfigLoading ? '…' : formatDusk(registrationFee)} <small>DUSK</small></strong>
          <span>for {duration} {pluralize(duration, 'year')} · until {expiryDate}</span>
        </div>
        <Button variant="primary" type="button" disabled={feeConfigLoading} onClick={onContinueRegistration}>
          Claim {displayName}
        </Button>
      </div>
    </Panel>
  )
}
