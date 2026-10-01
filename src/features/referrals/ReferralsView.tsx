import { AccountViewLayout } from '../../components/ui/AccountViewLayout'
import { ActiveReferralCard } from './ActiveReferralCard'
import { AccountViewHeader } from '../../components/ui/AccountViewHeader'
import { ReferralLinkCard } from './ReferralLinkCard'
import { ReferralRewardsCard } from './ReferralRewardsCard'
import type { ReferralsViewProps } from './referralsViewTypes'

export function ReferralsView({
  onClaimReferralRewards,
  onClearReferral,
  onCopyReferralLink,
  onOpenWalletConnection,
  referralAccountState,
  referralClaimRecipient,
  referralClaimable,
  referralCopied,
  referralError,
  referralLink,
  referralRewardClaimReady,
  referralRewardGuidance,
  referralRewardSummaryValue,
  referralRewardsSupported,
  referralState,
  referralBusy,
  referralConfirmation,
  referralTxState,
  selectedAddress,
  walletSetupState,
}: ReferralsViewProps) {
  return (
    <AccountViewLayout
      className="referrals-panel"
      confirmation={referralConfirmation}
      error={referralError}
      header={<AccountViewHeader heading="Referrals" headingId="referrals-heading" description="Share your link to earn part of the registration fee, at no extra cost to the buyer." />}
      labelledBy="referrals-heading"
      panelId="referrals"
    >
      <ReferralLinkCard
        onCopyReferralLink={onCopyReferralLink}
        onOpenWalletConnection={onOpenWalletConnection}
        referralCopied={referralCopied}
        referralLink={referralLink}
        selectedAddress={selectedAddress}
        walletSetupState={walletSetupState}
      />

      <ActiveReferralCard referral={referralState} onClear={onClearReferral} />

      {selectedAddress ? (
        <ReferralRewardsCard
          onClaimReferralRewards={onClaimReferralRewards}
          referralAccountState={referralAccountState}
          referralBusy={referralBusy}
          referralClaimRecipient={referralClaimRecipient}
          referralClaimable={referralClaimable}
          referralRewardClaimReady={referralRewardClaimReady}
          referralRewardGuidance={referralRewardGuidance}
          referralRewardSummaryValue={referralRewardSummaryValue}
          referralRewardsSupported={referralRewardsSupported}
          referralTxState={referralTxState}
        />
      ) : null}
    </AccountViewLayout>
  )
}
