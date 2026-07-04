import { AccountViewLayout } from '../../components/ui/AccountViewLayout'
import { ActiveReferralCard } from './ActiveReferralCard'
import { ReferralHeader } from './ReferralHeader'
import { ReferralLinkCard } from './ReferralLinkCard'
import { ReferralRewardsCard } from './ReferralRewardsCard'
import type { ReferralsViewProps } from './referralsViewTypes'

export function ReferralsView({
  activeReferral,
  appliedReferral,
  onClaimReferralRewards,
  onClearReferral,
  onCopyReferralLink,
  onOpenWalletConnection,
  onRefresh,
  onReferralInputChange,
  referralAccountState,
  referralAttributionLabel,
  referralClaimRecipient,
  referralClaimable,
  referralCopied,
  referralError,
  referralLink,
  referralLoading,
  referralRewardClaimReady,
  referralRewardGuidance,
  referralRewardSummaryValue,
  referralRewardsSupported,
  referralState,
  referralBusy,
  referralConfirmation,
  referralTxState,
  selectedAddress,
  showReferralSummary,
  walletSetupState,
}: ReferralsViewProps) {
  return (
    <AccountViewLayout
      className="referrals-panel"
      confirmation={referralConfirmation}
      error={referralError}
      header={(
        <ReferralHeader
          onRefresh={onRefresh}
          referralAttributionLabel={referralAttributionLabel}
          referralLoading={referralLoading}
          referralRewardSummaryValue={referralRewardSummaryValue}
          selectedAddress={selectedAddress}
          showReferralSummary={showReferralSummary}
          walletSetupState={walletSetupState}
        />
      )}
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

      <ActiveReferralCard
        activeReferral={activeReferral}
        appliedReferral={appliedReferral}
        onClearReferral={onClearReferral}
        onReferralInputChange={onReferralInputChange}
        referralAttributionLabel={referralAttributionLabel}
        referralState={referralState}
      />

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
    </AccountViewLayout>
  )
}
