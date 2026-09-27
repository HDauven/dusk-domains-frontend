import { AccountCard } from '../../components/ui/AccountCard'
import { abbreviate } from '../../utils/format'
import type { ReferralsViewProps } from './referralsViewTypes'

export function ActiveReferralCard({
  activeReferral,
  appliedReferral,
  onClearReferral,
  onReferralInputChange,
  referralState,
}: Pick<ReferralsViewProps,
  | 'activeReferral'
  | 'appliedReferral'
  | 'onClearReferral'
  | 'onReferralInputChange'
  | 'referralState'
>) {
  return (
    <AccountCard
      heading={appliedReferral || activeReferral ? abbreviate(referralState.input) : 'Nobody yet'}
      intro={appliedReferral ? 'Applies to your next registration.' : activeReferral ? 'Saved. It applies once referrals are switched on.' : 'If someone sent you here, paste their address. It costs you nothing.'}
      title="Referred by"
    >
      <div className="copy-row">
        <input
          value={referralState.input}
          placeholder="Their wallet address"
          onChange={(event) => onReferralInputChange(event.target.value)}
        />
        <button className="commit-button" disabled={!referralState.input} type="button" onClick={onClearReferral}>
          Clear
        </button>
      </div>
      {referralState.input && !referralState.valid ? <p className="secure-note danger">{referralState.reason}</p> : null}
      {appliedReferral ? <p className="secure-note">No extra fee for the buyer.</p> : null}
    </AccountCard>
  )
}
