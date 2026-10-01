import { Button } from '../../components/ui/Button'
import { abbreviate, formatDusk, pluralize } from '../../utils/format'
import type { ReferralState } from '../referrals/referralState'

// The stub beside every step: what is being claimed, for whom, and what it costs.
export function RegistrationSummary({
  activeReferral,
  appliedReferral,
  committed,
  displayName,
  duration,
  expiryDate,
  feeConfigError,
  onChangeTerm,
  registerSetsPrimary,
  registrationComplete,
  registrationFee,
  registrationTargetAddress,
  selectedAddress,
}: {
  activeReferral: ReferralState | null
  appliedReferral: ReferralState | null
  committed: boolean
  displayName: string
  duration: number
  expiryDate: string
  feeConfigError: string
  onChangeTerm: () => void
  registerSetsPrimary: boolean
  registrationComplete: boolean
  registrationFee: number
  registrationTargetAddress: string
  selectedAddress: string
}) {
  const pointsElsewhere = registrationTargetAddress && registrationTargetAddress !== selectedAddress

  return (
    <aside className="claim-stub register-summary" aria-label="Your claim">
      <span className="eyebrow">Your claim</span>
      <dl className="register-facts">
        <div>
          <dt>Name</dt>
          <dd>{displayName}</dd>
        </div>
        <div>
          <dt>Term</dt>
          <dd>
            {duration} {pluralize(duration, 'year')}
            {committed || registrationComplete ? null : (
              <Button variant="quiet" type="button" onClick={onChangeTerm}>Change</Button>
            )}
          </dd>
        </div>
        <div>
          <dt>Until</dt>
          <dd>{expiryDate}</dd>
        </div>
        {selectedAddress ? (
          <div>
            <dt>Owner</dt>
            <dd><code>{abbreviate(selectedAddress)}</code></dd>
          </div>
        ) : null}
        {pointsElsewhere ? (
          <div>
            <dt>Points to</dt>
            <dd><code>{abbreviate(registrationTargetAddress)}</code></dd>
          </div>
        ) : null}
        {selectedAddress ? (
          <div>
            <dt>Primary name</dt>
            <dd>{registerSetsPrimary ? 'Yes' : 'Not now'}</dd>
          </div>
        ) : null}
        {activeReferral ? (
          <div>
            <dt>Referral</dt>
            <dd>{appliedReferral ? abbreviate(activeReferral.input) : 'Saved'} · no extra cost</dd>
          </div>
        ) : null}
      </dl>
      <div className="claim-price">
        <strong>{formatDusk(registrationFee)} <small>DUSK</small></strong>
        <span>{registrationComplete ? 'Paid.' : 'Paid when you complete.'} Network fees show in your wallet.</span>
        {feeConfigError ? <span>Live pricing is unavailable, so this uses the default price list.</span> : null}
      </div>
    </aside>
  )
}
