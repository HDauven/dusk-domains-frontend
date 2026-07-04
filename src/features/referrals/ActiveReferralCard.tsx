import { AccountCard } from '../../components/ui/AccountCard'
import type { ReferralsViewProps } from './referralsViewTypes'

export function ActiveReferralCard({
  activeReferral,
  appliedReferral,
  onClearReferral,
  onReferralInputChange,
  referralAttributionLabel,
  referralState,
}: Pick<ReferralsViewProps,
  | 'activeReferral'
  | 'appliedReferral'
  | 'onClearReferral'
  | 'onReferralInputChange'
  | 'referralAttributionLabel'
  | 'referralState'
>) {
  return (
    <AccountCard
      heading={referralAttributionLabel}
      intro={appliedReferral ? 'Applies to your next registration.' : activeReferral ? 'Saved for later.' : 'Paste a referral before registering.'}
      title="Active referral"
    >
      <div className="copy-row">
        <input
          value={referralState.input}
          placeholder="Referral address"
          onChange={(event) => onReferralInputChange(event.target.value)}
        />
        <button className="commit-button save-record" disabled={!referralState.input} type="button" onClick={onClearReferral}>
          Clear
        </button>
      </div>
      {referralState.input && !referralState.valid ? <p className="secure-note danger">{referralState.reason}</p> : null}
      {appliedReferral ? <p className="secure-note">No extra fee for the buyer.</p> : null}
    </AccountCard>
  )
}
