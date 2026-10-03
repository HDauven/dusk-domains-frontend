import type { NameResult } from '../../names/internal'
import { PremiumNotice } from './PremiumNotice'
import { useId } from 'react'
import { Button } from '../../components/ui/Button'
import { Switch } from '../../components/ui/Switch'
import { abbreviate, formatDusk, pluralize } from '../../utils/format'
import type { ReferralState } from '../referrals/referralState'

// The stub beside every step: what is being claimed, for whom, and what it costs.
export function RegistrationSummary({
  premiumResult,
  currentBlockHeight,
  activeReferral,
  appliedReferral,
  committed,
  duration,
  expiryDate,
  feeConfigError,
  onChangeTerm,
  onRegisterSetsPrimaryChange,
  primaryChoiceLocked = false,
  registerSetsPrimary,
  registrationComplete,
  registrationFee,
  registrationTargetAddress,
  selectedAddress,
}: {
  premiumResult?: NameResult
  currentBlockHeight?: number | null
  activeReferral: ReferralState | null
  appliedReferral: ReferralState | null
  committed: boolean
  duration: number
  expiryDate: string
  feeConfigError: string
  onRegisterSetsPrimaryChange?: (checked: boolean) => void
  onChangeTerm: () => void
  primaryChoiceLocked?: boolean
  registerSetsPrimary: boolean
  registrationComplete: boolean
  registrationFee: number
  registrationTargetAddress: string
  selectedAddress: string
}) {
  const pointsElsewhere = registrationTargetAddress && registrationTargetAddress !== selectedAddress
  const primaryLabelId = useId()

  return (
    <aside className="claim-stub register-summary" aria-label="Your claim">
      <span className="eyebrow">Your claim</span>
      <dl className="register-facts">
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
            <dd>You</dd>
          </div>
        ) : null}
        {pointsElsewhere ? (
          <div>
            <dt>Points to</dt>
            <dd><code>{abbreviate(registrationTargetAddress)}</code></dd>
          </div>
        ) : null}
        {selectedAddress ? (
          <div className="register-primary">
            <dt id={primaryLabelId}>Primary name</dt>
            <dd>{!registrationComplete && onRegisterSetsPrimaryChange ? <Switch disabled={primaryChoiceLocked} aria-labelledby={primaryLabelId} checked={registerSetsPrimary} onCheckedChange={onRegisterSetsPrimaryChange} /> : registerSetsPrimary ? 'On' : 'Off'}</dd>
          </div>
        ) : null}
        {activeReferral ? (
          <div>
            <dt>Referral</dt>
            <dd>{appliedReferral ? abbreviate(activeReferral.input) : 'Saved'} · no extra cost</dd>
          </div>
        ) : null}
      </dl>
      <PremiumNotice result={premiumResult} currentBlockHeight={currentBlockHeight} />
      <div className="claim-price">
        <strong>{formatDusk(registrationFee)} <small>DUSK</small></strong>
        <span>{registrationComplete ? 'Paid.' : 'Paid when you register.'} Network fees show in your wallet.</span>
        {feeConfigError ? <span>Live pricing is unavailable, so this uses the default price list.</span> : null}
      </div>
    </aside>
  )
}
