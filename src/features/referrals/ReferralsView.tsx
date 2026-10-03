import { AccountViewLayout } from '../../components/ui/AccountViewLayout'
import { ActiveReferralCard } from './ActiveReferralCard'
import { AccountViewHeader } from '../../components/ui/AccountViewHeader'
import { ReferralLinkCard } from './ReferralLinkCard'
import { ReferralRewardsCard } from './ReferralRewardsCard'
import type { ReferralsViewProps } from './referralsViewTypes'

export function ReferralsView({ onClearReferral, referralError, referralState, referralConfirmation, wallet, link, rewards }: ReferralsViewProps) {
  return (
    <AccountViewLayout
      className="referrals-panel"
      confirmation={referralConfirmation}
      error={referralError}
      header={<AccountViewHeader heading="Referrals" headingId="referrals-heading" description="Share your link to earn part of the registration fee, at no extra cost to the buyer." />}
      labelledBy="referrals-heading"
      panelId="referrals"
    >
      <ReferralLinkCard link={link} wallet={wallet} />

      <ActiveReferralCard referral={referralState} onClear={onClearReferral} />

      {wallet.selectedAddress ? (
        <ReferralRewardsCard rewards={rewards} />
      ) : null}
    </AccountViewLayout>
  )
}
